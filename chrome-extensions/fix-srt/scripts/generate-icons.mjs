import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/icons')
fs.mkdirSync(outDir, { recursive: true })

const sizes = [16, 32, 48, 128]

for (const size of sizes) {
  const png = renderIcon(size)
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), png)
}

function renderIcon(size) {
  const pixels = Buffer.alloc(size * size * 4, 0)
  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    const i = (y * size + x) * 4
    pixels[i] = r
    pixels[i + 1] = g
    pixels[i + 2] = b
    pixels[i + 3] = a
  }

  const fillRoundRect = (x0, y0, x1, y1, radius, color) => {
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const dx = x < x0 + radius ? x0 + radius - x : x >= x1 - radius ? x - (x1 - radius - 1) : 0
        const dy = y < y0 + radius ? y0 + radius - y : y >= y1 - radius ? y - (y1 - radius - 1) : 0
        if (dx * dx + dy * dy <= radius * radius + radius) set(x, y, ...color)
      }
    }
  }

  fillRoundRect(0, 0, size, size, Math.round(size * 0.22), [79, 70, 229])

  // Play triangle
  const left = Math.round(size * 0.34)
  const right = Math.round(size * 0.72)
  const top = Math.round(size * 0.22)
  const bottom = Math.round(size * 0.68)
  const mid = Math.round((top + bottom) / 2)
  for (let y = top; y <= bottom; y += 1) {
    const t = (y - top) / Math.max(1, bottom - top)
    const maxX = y <= mid
      ? left + Math.round((right - left) * (t / 0.5))
      : left + Math.round((right - left) * ((1 - t) / 0.5))
    for (let x = left; x <= maxX; x += 1) set(x, y, 255, 255, 255)
  }

  // Caption bars
  const barY1 = Math.round(size * 0.78)
  const barY2 = Math.round(size * 0.88)
  for (let y = barY1; y < barY1 + Math.max(1, Math.round(size * 0.05)); y += 1) {
    for (let x = Math.round(size * 0.18); x < Math.round(size * 0.46); x += 1) set(x, y, 199, 210, 254)
  }
  for (let y = barY2; y < barY2 + Math.max(1, Math.round(size * 0.05)); y += 1) {
    for (let x = Math.round(size * 0.18); x < Math.round(size * 0.62); x += 1) set(x, y, 165, 180, 252)
  }

  return encodePng(pixels, size, size)
}

function encodePng(rgba, width, height) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const chunks = [
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]
  return Buffer.concat(chunks)
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([typeBuf, data])
  const crc = crc32(body)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc >>> 0, 0)
  return Buffer.concat([len, body, crcBuf])
}

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1)
      crc = (crc >>> 1) ^ (0xedb88320 & mask)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

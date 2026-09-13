/**
 * Generate the extension's icon set from the existing VideoText app icon.
 *
 * Source: client/public/icons/icon-192.png — the production VideoText mark
 * (purple rounded square, white play triangle). The extension deliberately
 * reuses it rather than inventing a second visual identity; this script only
 * downscales it to the sizes Chrome asks for.
 *
 * Implemented with Node's built-in zlib so the build needs no image library:
 * the source is an 8-bit truecolour, non-interlaced PNG, which is a small,
 * well-defined subset to decode and re-encode.
 *
 * Usage: node scripts/generate-icons.mjs
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync, inflateSync } from 'node:zlib'

const HERE = dirname(fileURLToPath(import.meta.url))
const EXTENSION_ROOT = resolve(HERE, '..')
const REPO_ROOT = resolve(EXTENSION_ROOT, '..', '..')
const SOURCE = resolve(REPO_ROOT, 'client/public/icons/icon-192.png')
const OUT_DIR = resolve(EXTENSION_ROOT, 'icons')

/** Sizes required/recommended by Chrome for an MV3 extension action + store listing. */
const SIZES = [16, 32, 48, 128]

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** Decode an 8-bit truecolour (RGB or RGBA), non-interlaced PNG into {width, height, channels, pixels}. */
function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('Not a PNG file')

  let width = 0
  let height = 0
  let channels = 0
  const idat = []

  let offset = 8
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.subarray(offset + 4, offset + 8).toString('latin1')
    const data = buffer.subarray(offset + 8, offset + 8 + length)

    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      const bitDepth = data[8]
      const colourType = data[9]
      const interlace = data[12]
      if (bitDepth !== 8) throw new Error(`Unsupported bit depth ${bitDepth} (expected 8)`)
      if (colourType !== 2 && colourType !== 6) {
        throw new Error(`Unsupported colour type ${colourType} (expected 2 or 6)`)
      }
      if (interlace !== 0) throw new Error('Interlaced PNGs are not supported')
      channels = colourType === 2 ? 3 : 4
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data))
    } else if (type === 'IEND') {
      break
    }
    offset += 12 + length
  }

  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const pixels = Buffer.alloc(height * stride)

  // Undo the per-scanline PNG filters (RFC 2083 §6).
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride)
    const out = pixels.subarray(y * stride, (y + 1) * stride)
    const prior = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null

    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[x - channels] : 0
      const b = prior ? prior[x] : 0
      const c = prior && x >= channels ? prior[x - channels] : 0
      let value = line[x]
      switch (filter) {
        case 0: break
        case 1: value += a; break
        case 2: value += b; break
        case 3: value += Math.floor((a + b) / 2); break
        case 4: {
          const p = a + b - c
          const pa = Math.abs(p - a)
          const pb = Math.abs(p - b)
          const pc = Math.abs(p - c)
          value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
          break
        }
        default: throw new Error(`Unknown PNG filter type ${filter}`)
      }
      out[x] = value & 0xff
    }
  }

  return { width, height, channels, pixels }
}

/** Box-filter downscale. Averaging every source pixel in each target cell keeps the mark's edges clean. */
function resize(image, size) {
  const { width, height, channels, pixels } = image
  const out = Buffer.alloc(size * size * channels)

  for (let ty = 0; ty < size; ty++) {
    const y0 = Math.floor((ty * height) / size)
    const y1 = Math.max(y0 + 1, Math.floor(((ty + 1) * height) / size))
    for (let tx = 0; tx < size; tx++) {
      const x0 = Math.floor((tx * width) / size)
      const x1 = Math.max(x0 + 1, Math.floor(((tx + 1) * width) / size))
      const sums = new Array(channels).fill(0)
      let count = 0
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const base = (y * width + x) * channels
          for (let c = 0; c < channels; c++) sums[c] += pixels[base + c]
          count++
        }
      }
      const target = (ty * size + tx) * channels
      for (let c = 0; c < channels; c++) out[target + c] = Math.round(sums[c] / count)
    }
  }

  return { width: size, height: size, channels, pixels: out }
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typeAndData = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData) >>> 0)
  return Buffer.concat([length, typeAndData, crc])
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function encodePng({ width, height, channels, pixels }) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = channels === 3 ? 2 : 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const stride = width * channels
  const raw = Buffer.alloc(height * (stride + 1))
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const source = decodePng(readFileSync(SOURCE))
mkdirSync(OUT_DIR, { recursive: true })

for (const size of SIZES) {
  const png = encodePng(resize(source, size))
  const path = resolve(OUT_DIR, `icon-${size}.png`)
  writeFileSync(path, png)
  console.log(
    `icons/icon-${size}.png  ${String(png.length).padStart(6)} bytes  sha256:${createHash('sha256').update(png).digest('hex').slice(0, 12)}`
  )
}

console.log(`\nGenerated ${SIZES.length} icons from ${SOURCE.replace(`${REPO_ROOT}/`, '')}`)

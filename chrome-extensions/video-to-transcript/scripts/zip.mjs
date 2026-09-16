/**
 * Minimal ZIP writer for the Chrome Web Store upload package.
 *
 * Written against Node's built-in zlib rather than shelling out to `zip` or
 * adding a dependency, so `npm run chrome:transcript:build` produces a
 * byte-identical package on any machine with Node.
 *
 * The Web Store requires manifest.json at the ROOT of the archive, so entries
 * are written with paths relative to dist/ and never under a wrapper folder.
 */
import { createWriteStream } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { deflateRawSync } from 'node:zlib'

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

/** Fixed DOS timestamp (1980-01-01) so repeated builds of the same sources produce identical archives. */
const DOS_TIME = 0
const DOS_DATE = 0x0021

async function walk(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(full, base)))
    } else if (entry.isFile()) {
      files.push(relative(base, full).split(sep).join('/'))
    }
  }
  return files
}

/**
 * Zip every file under `sourceDir` into `outFile`, rooted at sourceDir.
 * Returns the list of archive entry paths, in archive order.
 */
export async function zipDirectory(sourceDir, outFile) {
  const names = await walk(sourceDir)
  // manifest.json first — not required by the format, but it makes the root
  // placement obvious to anyone listing the archive.
  names.sort((a, b) => (a === 'manifest.json' ? -1 : b === 'manifest.json' ? 1 : a.localeCompare(b)))

  const localParts = []
  const centralParts = []
  let offset = 0

  for (const name of names) {
    const content = await readFile(join(sourceDir, name))
    const nameBytes = Buffer.from(name, 'utf8')
    const compressed = deflateRawSync(content, { level: 9 })
    // Only use deflate when it actually helps; otherwise store.
    const useDeflate = compressed.length < content.length
    const body = useDeflate ? compressed : content
    const method = useDeflate ? 8 : 0
    const crc = crc32(content)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0, 6) // flags
    local.writeUInt16LE(method, 8)
    local.writeUInt16LE(DOS_TIME, 10)
    local.writeUInt16LE(DOS_DATE, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(body.length, 18)
    local.writeUInt32LE(content.length, 22)
    local.writeUInt16LE(nameBytes.length, 26)
    local.writeUInt16LE(0, 28)
    localParts.push(local, nameBytes, body)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4) // version made by
    central.writeUInt16LE(20, 6) // version needed
    central.writeUInt16LE(0, 8)
    central.writeUInt16LE(method, 10)
    central.writeUInt16LE(DOS_TIME, 12)
    central.writeUInt16LE(DOS_DATE, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(body.length, 20)
    central.writeUInt32LE(content.length, 24)
    central.writeUInt16LE(nameBytes.length, 28)
    central.writeUInt16LE(0, 30) // extra
    central.writeUInt16LE(0, 32) // comment
    central.writeUInt16LE(0, 34) // disk
    central.writeUInt16LE(0, 36) // internal attrs
    central.writeUInt32LE(((0o100644 << 16) >>> 0), 38) // external attrs: regular file, 0644
    central.writeUInt32LE(offset, 42)
    centralParts.push(central, nameBytes)

    offset += local.length + nameBytes.length + body.length
  }

  const centralBuffer = Buffer.concat(centralParts)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(names.length, 8)
  end.writeUInt16LE(names.length, 10)
  end.writeUInt32LE(centralBuffer.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)

  await new Promise((resolvePromise, reject) => {
    const stream = createWriteStream(outFile)
    stream.on('error', reject)
    stream.on('finish', resolvePromise)
    for (const part of localParts) stream.write(part)
    stream.write(centralBuffer)
    stream.write(end)
    stream.end()
  })

  const { size } = await stat(outFile)
  return { entries: names, bytes: size }
}

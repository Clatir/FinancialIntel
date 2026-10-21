/**
 * `node:zlib`, `node:stream` and `node:stream/promises` on the phone (T303): the data store imports them for the ZIP
 * backups and the restore, which the phone never runs (backups are made by the computers). Calling one says so.
 */

function unsupported(name: string): never {
  throw new Error(`${name} nie działa na telefonie – kopie zapasowe robi komputer.`)
}

export const deflateRawSync = (): never => unsupported('zlib')
export const inflateRawSync = (): never => unsupported('zlib')
export const createDeflateRaw = (): never => unsupported('zlib')
export const createInflateRaw = (): never => unsupported('zlib')
export const crc32 = (): never => unsupported('zlib')
export const pipeline = (): never => unsupported('stream')
export class Readable {
  constructor() {
    unsupported('stream')
  }
}
export class Writable {
  constructor() {
    unsupported('stream')
  }
}

export default { deflateRawSync, inflateRawSync, createDeflateRaw, createInflateRaw, crc32, pipeline, Readable, Writable }

import zlib from 'zlib'
import fs from 'fs'
import path from 'path'

import mimeType from '#nodes/mimeType.js'
import nonGzipTypes from '#nodes/nonGzipTypes.js'

import addCorsHeadersIfNeeded from '#nodes/addCorsHeadersIfNeeded.js'

/**
 * @param {import('./types.js').StreamFileOptions} options
 */
export default function streamFile({
  file,
  stream,
  requestMethod,
  requestAuthority,
  requestRange,
  stats,
  status,
  useGzip,
  useCache,
  cacheControl,
  lastModified,
  useCors,
  allowedOrigins,
  allowedMethods,
  allowedHeaders,
  allowedCredentials,
  maxAge
}) {
  const gzip = zlib.createGzip()
  const mappedMimeType = mimeType(file, 'text/plain')
  /** @type {import('./types.js').ResponseHeaders} */
  const responseHeaders = {
    'content-type': mappedMimeType
  }
  const ext = path.extname(file).toLowerCase().trim().slice(1)
  const isFileCanBeCompressed = nonGzipTypes.indexOf(ext) === -1

  const fileSize = stats.size
  let start = 0
  let end = fileSize - 1

  if (useGzip && isFileCanBeCompressed && !requestRange) {
    responseHeaders['content-encoding'] = 'gzip'
    responseHeaders[':status'] = status
  } else {
    if (requestRange) {
      const rangeMatch = requestRange.match(/bytes=(\d*)-(\d*)/)
      if (rangeMatch) {
        start = rangeMatch[1] ? parseInt(rangeMatch[1], 10) : 0
        end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : end

        // safety checks
        if (isNaN(start) || isNaN(end) || start > end || end >= fileSize) {
          stream.respond({ ':status': 416 }) // Requested Range Not Satisfiable
          stream.end()
          return
        }

        responseHeaders[':status'] = 206
        responseHeaders['content-range'] = `bytes ${start}-${end}/${fileSize}`
        responseHeaders['content-length'] = end - start + 1
        responseHeaders['accept-ranges'] = 'bytes'
      }
    } else {
      responseHeaders[':status'] = status
      responseHeaders['content-length'] = fileSize
    }
  }
  // if (useCache) {
  //   responseHeaders['etag'] = lastModified
  // }
  if (cacheControl) {
    responseHeaders['cache-control'] = cacheControl
  }

  addCorsHeadersIfNeeded(
    responseHeaders,
    requestAuthority, {
    useCors,
    allowedOrigins,
    allowedMethods,
    allowedHeaders,
    allowedCredentials,
    maxAge
  })

  if (requestMethod === 'OPTIONS') {
    responseHeaders[':status'] = 204
    stream.respond(responseHeaders)
    stream.end()
    return
  }

  let readStream
  try {
    readStream = fs.createReadStream(file, {
      start,
      end,
      highWaterMark: 1024
    })
  } catch (err) {
    if (
      !stream.closed &&
      !stream.destroyed &&
      !stream.writableEnded &&
      !stream.aborted
    ) {
      stream.respond({ ':status': 500 })
      stream.end(`Internal Server Error while creating read stream for file: ${file}`)
    }
    return
  }
  let outputStream = /** @type {import('node:stream').Readable} */ (readStream)
  if (useGzip && isFileCanBeCompressed && !requestRange) {
    outputStream = /** @type {import('node:stream').Readable} */ (readStream.pipe(gzip))
  }
  if (
    !stream.closed &&
    !stream.destroyed && 
    !stream.writableEnded && 
    !stream.aborted
  ) {
    stream.respond(responseHeaders)
    outputStream.pipe(/** @type {import('node:stream').Writable} */ (/** @type {unknown} */ (stream)))
  }
  outputStream.on('error', (err) => {
    if (
      !stream.closed &&
      !stream.destroyed && 
      !stream.writableEnded && 
      !stream.aborted
    ) {
      stream.respond({ ':status': 500 })
      stream.end(`Internal Server Error while streaming file: ${file}`)
    }
  })
  outputStream.on('end', () => {
    if (
      !stream.closed &&
      !stream.destroyed && 
      !stream.writableEnded && 
      !stream.aborted
    ) {
      stream.end()
    }
  })
}

import zlib from 'zlib'
import fs from 'fs'
import path from 'path'

import allowedOrigin from '#nodes/allowedOrigin.js'
import mimeType from '#nodes/mimeType.js'
import nonGzipTypes from '#nodes/nonGzipTypes.js'

import addCorsHeadersIfNeeded from '#nodes/addCorsHeadersIfNeeded.js'

/**
 * Streams a file to the client, with optional Gzip compression, caching, and CORS support.
 *
 * @param {string} file - The path to the file to be streamed.
 * @param {Object} stream - The HTTP/2 stream object.
 * @param {string} requestMethod - The HTTP method of the request (e.g., `GET`, `OPTIONS`).
 * @param {string} requestAuthority - The request's authority (e.g., host and port).
 * @param {Object} stats - File statistics, such as size, obtained using `fs.stat`.
 * @param {number} status - The HTTP status code to respond with (e.g., 200, 404).
 * @param {boolean} useGzip - Whether to enable Gzip compression for the file.
 * @param {boolean} useCache - Whether to enable caching for the file.
 * @param {string} [cacheControl] - The `Cache-Control` header value.
 * @param {string} lastModified - The last modified timestamp of the file.
 * @param {boolean} useCors - Whether to enable CORS for the response.
 * @param {string[]} [allowedOrigins] - A list of allowed origins for CORS.
 * @param {string[]} [allowedMethods] - A list of allowed HTTP methods for CORS.
 * @param {string[]} [allowedHeaders] - A list of allowed HTTP headers for CORS.
 * @param {boolean} [allowedCredentials] - Whether to allow credentials in CORS requests.
 * @param {number} [maxAge] - The maximum age (in seconds) for caching CORS preflight responses.
 * @returns {void}
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
  const mappedMimeType = mimeType(file)
  const responseHeaders = {
    'content-type': mappedMimeType
  }
  const ext = path.extname(file).toLowerCase().trim().split('.')[1]
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
  if (useCache) {
    responseHeaders['etag'] = lastModified
  }
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
    stream.respond(responseHeaders)
    stream.end()
    return
  }
  let outputStream = readStream
  if (useGzip && isFileCanBeCompressed && !requestRange) {
    outputStream = readStream.pipe(gzip)
  }
  if (
    !stream.closed &&
    !stream.destroyed && 
    !stream.writableEnded && 
    !stream.aborted
  ) {
    stream.respond(responseHeaders)
    outputStream.pipe(stream)
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

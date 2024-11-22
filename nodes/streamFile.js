const zlib = require('zlib')
const fs = require('fs')

const allowedOrigin = require('./allowedOrigin')
const mimeType = require('./mimeType')

const addCorsHeadersIfNeeded = require('./addCorsHeadersIfNeeded')

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
module.exports = function streamFile(
  file,
  stream,
  requestMethod,
  requestAuthority,
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
) {
  const gzip = zlib.createGzip()
  const mappedMimeType = mimeType(file)
  const responseHeaders = {
    'content-type': mappedMimeType,
    ':status': status
  }
  if (useGzip) {
    responseHeaders['content-encoding'] = 'gzip'
  } else {
    responseHeaders['content-length'] = stats.size
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
  } else {
    const readStream = fs.createReadStream(file, {
      highWaterMark: 1024
    })
    let gzipOptionalStream = readStream
    if (useGzip) {
      gzipOptionalStream = readStream.pipe(gzip)
    }
    stream.respond(responseHeaders)
    gzipOptionalStream.pipe(stream)
    gzipOptionalStream.on('error', (err) => {
      stream.respond({ ':status': 500 })
      stream.end(`Internal Server Error while streaming file: ${file}`)
    })
    gzipOptionalStream.on('end', () => {
      stream.end()
    })
  }
}

const zlib = require('zlib')
const fs = require('fs')

const allowedOrigin = require('./allowedOrigin')
const mimeType = require('./mimeType')

const addCorsHeadersIfNeeded = require('./addCorsHeadersIfNeeded')

module.exports = function streamFile(
  file,
  stream,
  requestMethod,
  requestOrigin,
  requestHost,
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
    requestOrigin,
    requestHost, {
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

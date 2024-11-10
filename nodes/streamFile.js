const zlib = require('zlib')
const fs = require('fs')

const allowedOrigin = require('./allowedOrigin')
const mimeType = require('./mimeType')

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
    'content-length': stats.size,
    ':status': status
  }
  if (useGzip) {
    responseHeaders['content-encoding'] = 'gzip'
  }
  if (useCache) {
    responseHeaders['etag'] = lastModified
  }
  if (cacheControl) {
    responseHeaders['cache-control'] = cacheControl
  }
  if (allowedOrigins) {
    responseHeaders['access-control-allow-origin'] = allowedOrigin(
      allowedOrigins,
      requestOrigin,
      requestHost
    )
    if (allowedMethods) {
      responseHeaders['access-control-allow-methods'] = allowedMethods.join(', ')
    } else {
      responseHeaders['access-control-allow-methods'] = 'GET,OPTIONS'
    }
    if (allowedHeaders) {
      responseHeaders['access-control-allow-headers'] = allowedHeaders.join(', ')
    } else {
      responseHeaders['access-control-allow-headers'] = '*'
    }
    if (allowedCredentials) {
      responseHeaders['access-control-allow-credentials'] = true
    }
    if (maxAge) {
      responseHeaders['access-control-max-age'] = maxAge
    }
  }
  if (requestMethod === 'OPTIONS') {
    responseHeaders[':status'] = 204
    stream.respond(responseHeaders)
    stream.end()
  } else {
    stream.respond(responseHeaders)
    const readStream = fs.createReadStream(file, {
      encoding: 'utf8',
      highWaterMark: 1024
    })
    let gzipOptionalStream = readStream
    if (useGzip) {
      gzipOptionalStream = readStream.pipe(gzip)
    }
    gzipOptionalStream.pipe(stream)
  }
}

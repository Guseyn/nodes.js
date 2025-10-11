const { GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3')
const zlib = require('zlib')
const mimeType = require('./mimeType')
const addCorsHeadersIfNeeded = require('./addCorsHeadersIfNeeded')

module.exports = async function streamS3File(
  storageClient,
  s3Key,
  bucket,
  stream,
  requestMethod,
  requestAuthority,
  status = 200,
  useGzip = false,
  useCache = false,
  cacheControl,
  lastModified,
  useCors = false,
  allowedOrigins,
  allowedMethods,
  allowedHeaders,
  allowedCredentials,
  maxAge
) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: s3Key
    })

    let bodyStream
    let data
    try {
      data = await storageClient.send(command)
      bodyStream = data.Body // this is a readable stream
    } catch (err) {
      if (!stream.closed) {
        stream.respond({ ':status': 404 })
        stream.end(JSON.stringify({
          error: 'File Not Found.'
        }))
      }
      return
    }

    const mappedMimeType = mimeType(s3Key)
    const gzip = zlib.createGzip()

    const responseHeaders = {
      'content-type': mappedMimeType,
      ':status': status
    }

    if (useGzip) {
      responseHeaders['content-encoding'] = 'gzip'
    } else if (data.ContentLength) {
      responseHeaders['content-length'] = data.ContentLength
    }

    if (useCache && lastModified) {
      responseHeaders['etag'] = lastModified
    }

    if (cacheControl) {
      responseHeaders['cache-control'] = cacheControl
    }

    addCorsHeadersIfNeeded(responseHeaders, requestAuthority, {
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

    if (!stream.closed) {
      stream.respond(responseHeaders)
    }

    let outStream = bodyStream
    if (useGzip) {
      outStream = bodyStream.pipe(gzip)
    }

    outStream.pipe(stream)

    outStream.on('error', (err) => {
      if (!stream.closed) {
        stream.respond({ ':status': 500 })
        stream.end('Internal Server Error while streaming S3 object.')
      }
    })

    outStream.on('end', () => {
      if (!stream.closed) {
        stream.end()
      }
    })

  } catch (err) {
    if (!stream.closed) {
      stream.respond({ ':status': 500 })
      stream.end('File could not be served on S3.')
    }
  }
}

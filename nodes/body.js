const RequestBodySizeExceededMaxSizeError = require('./RequestBodySizeExceededMaxSizeError')

module.exports = function body(stream, { maxSize } = {}) {
  const maxSizeInBytes = maxSize ? maxSize * 1e6 : undefined
  return new Promise((resolve, reject) => {
    const body = []
    let bodySize = 0
    stream.on('data', (chunk) => {
      body.push(chunk)
      bodySize += chunk.length
      if (maxSizeInBytes !== undefined && bodySize > maxSizeInBytes) {
        reject(new RequestBodySizeExceededMaxSizeError(maxSize))
      }
    })
    stream.on('end', () => {
      resolve(Buffer.concat(body))
    })
    stream.on('error', (err) => {
      reject(err)
    })
  })
}

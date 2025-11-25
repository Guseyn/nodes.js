import RequestBodySizeExceededMaxSizeError from '#nodes/RequestBodySizeExceededMaxSizeError.js'

/**
 * Collects data from a readable stream into a buffer with an optional maximum size limit.
 *
 * @param {Readable} stream - The readable stream to collect data from.
 * @param {Object} [options] - Configuration options.
 * @param {number} [options.maxSize] - The maximum size of the body in megabytes (MB). If exceeded, the promise rejects.
 * @returns {Promise<Buffer>} A promise that resolves with the collected data as a buffer or rejects if the maximum size is exceeded or another error occurs.
 * @throws {RequestBodySizeExceededMaxSizeError} If the body size exceeds the specified `maxSize`.
 */
export default function body(stream, { maxSize } = {}) {
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
      const fullBody = Buffer.concat(body)
      resolve(fullBody)
    })
    stream.on('error', (err) => {
      reject(err)
    })
  })
}

import RequestBodySizeExceededMaxSizeError from '#nodes/RequestBodySizeExceededMaxSizeError.js'

/**
 * Collects data from a readable stream into a buffer with an optional maximum size limit.
 *
 * @param {import('./types.js').NodesRequestStream} stream
 * @param {import('./types.js').BodyOptions} [options]
 * @returns {Promise<Buffer>}
 */
export default function body(stream, { maxSize } = {}) {
  const maxSizeInBytes = maxSize ? maxSize * 1e6 : undefined
  return new Promise((resolve, reject) => {
    /**
     * @type {readonly Uint8Array<ArrayBufferLike>[] & ArrayBufferLike[][]}
     */
    const body = []
    let bodySize = 0
    stream.on('data', (/** @type {readonly Uint8Array<ArrayBufferLike> & ArrayBufferLike[]} */ chunk) => {
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
    stream.on('error', (/** @type {any} */ err) => {
      reject(err)
    })
  })
}

/**
 * Handles requests to non-existent sources by responding with a 404 status code.
 *
 * @param {Object} options - Configuration options for the handler.
 * @param {Object} options.stream - The HTTP/2 or HTTP/1.x stream object associated with the request.
 * @returns {Promise<void>} Resolves after the response is sent and the stream is closed.
 */
export default async function defaultSrcNotFoundHandler({ stream }) {
  const body = '404 Not Found'
  stream.respond({
    'content-type': 'text/plain; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    ':status': 404
  })
  stream.end(body)
}

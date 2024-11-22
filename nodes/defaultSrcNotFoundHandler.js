/**
 * Handles requests to non-existent sources by responding with a 404 status code.
 *
 * @param {Object} options - Configuration options for the handler.
 * @param {Object} options.stream - The HTTP/2 or HTTP/1.x stream object associated with the request.
 * @returns {Promise<void>} Resolves after the response is sent and the stream is closed.
 *
 * @description
 * This function handles cases where the requested source cannot be found.
 * It responds with a `404 Not Found` HTTP status code and closes the stream
 * with a plain-text message indicating the resource was not found.
 */
module.exports = async function defaultSrcNotFoundHandler({
  stream
}) {
  stream.respond({
    'content-type': 'text/plain',
    ':status': 404
  })
  stream.end('404 Not Found')
}

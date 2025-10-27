/**
 * Handles requests to endpoints that are not allowed by responding with a 405 status code.
 *
 * @param {Object} options - Configuration options for the handler.
 * @param {Object} options.stream - The HTTP/2 or HTTP/1.x stream object associated with the request.
 * @returns {Promise<void>} Resolves after the response is sent and the stream is closed.
 *
 * @description
 * This function is used to handle requests to endpoints that are not allowed. It responds
 * with a plain-text message and a `405 Not Allowed` HTTP status code, then closes the stream.
 */
export default async function defaultEndpointNotAllowedHandler({
  stream
}) {
  stream.respond({
    'content-type': 'text/plain',
    ':status': 405
  })
  stream.end('405 Not Allowed')
}

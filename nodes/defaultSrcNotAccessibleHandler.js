/**
 * Handles requests to inaccessible sources by responding with a 403 status code.
 *
 * @param {Object} options - Configuration options for the handler.
 * @param {Object} options.stream - The HTTP/2 or HTTP/1.x stream object associated with the request.
 * @returns {Promise<void>} Resolves after the response is sent and the stream is closed.
 *
 * @description
 * This function handles cases where the requested source is not accessible.
 * It responds with a `403 Forbidden` HTTP status code, indicating that access
 * to the resource is not allowed, and closes the stream with a custom message.
 */
export default async function defaultSrcNotAccessibleHandler({
  stream
}) {
  stream.respond({
    'content-type': 'text/plain',
    ':status': 403
  })
  stream.end('404 Not Accessible')
}

import addCorsHeadersIfNeeded from '#nodes/addCorsHeadersIfNeeded.js'

/**
 * Handles CORS headers and responds to the HTTP/2 or HTTP/1.x stream with appropriate headers.
 *
 * @param {Object} options - Configuration options for the CORS handler.
 * @param {Object} options.stream - The HTTP/2 or HTTP/1.x stream object for the request.
 * @param {Object} options.headers - The headers object to which CORS headers will be added.
 * @param {boolean} [options.useCors] - Whether to enable CORS headers.
 * @param {string[]} [options.allowedOrigins] - A list of allowed origins. If not provided, defaults to allowing all origins if `useCors` is true.
 * @param {string[]} [options.allowedMethods] - A list of HTTP methods to allow. Defaults to `GET,OPTIONS` if `useCors` is true.
 * @param {string[]} [options.allowedHeaders] - A list of HTTP headers to allow. Defaults to `*` if `useCors` is true.
 * @param {boolean} [options.allowedCredentials] - Whether to include credentials in CORS requests.
 * @param {number} [options.maxAge] - The maximum time (in seconds) that the preflight request is cached.
 * @param {string} options.requestAuthority - The origin of the incoming request.
 */
export default function corsHandler({
  stream, headers, useCors,
  allowedOrigins,
  allowedMethods,
  allowedHeaders,
  allowedCredentials,
  maxAge,
  requestAuthority
}) {
  addCorsHeadersIfNeeded(
    headers,
    requestAuthority, {
    useCors,
    allowedOrigins,
    allowedMethods,
    allowedHeaders,
    allowedCredentials,
    maxAge
  })
  if (requestAuthority) {
    responseHeaders['x-authority'] = requestAuthority
  }
  stream.respond(headers)
  stream.end()
}

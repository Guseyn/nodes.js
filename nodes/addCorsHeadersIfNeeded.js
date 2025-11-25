import allowedOrigin from '#nodes/allowedOrigin.js'

/**
 * Adds CORS headers to the response if needed based on the configuration provided.
 *
 * @param {Object} responseHeaders - The response headers object to which CORS headers will be added.
 * @param {string} requestAuthority - The origin of the incoming request.
 * @param {Object} [options] - Optional configuration for adding CORS headers.
 * @param {boolean} [options.useCors] - Whether to enable CORS headers.
 * @param {string[]} [options.allowedOrigins] - A list of allowed origins. If not specified, all origins are allowed when `useCors` is true.
 * @param {string[]} [options.allowedMethods] - A list of HTTP methods to allow. Defaults to `GET,OPTIONS` when `useCors` is true.
 * @param {string[]} [options.allowedHeaders] - A list of HTTP headers to allow. Defaults to all headers (`*`) when `useCors` is true.
 * @param {boolean} [options.allowedCredentials] - Whether to include credentials in CORS requests.
 * @param {number} [options.maxAge] - The maximum time (in seconds) that the preflight request is cached.
 */
export default function addCorsHeadersIfNeeded(
  responseHeaders,
  requestAuthority, {
  useCors,
  allowedOrigins,
  allowedMethods,
  allowedHeaders,
  allowedCredentials,
  maxAge
} = {}) {
  if (useCors || allowedOrigins) {
    const determinedAllowedOrigin = allowedOrigin(
      allowedOrigins,
      requestAuthority
    )
    if (determinedAllowedOrigin) {
      responseHeaders['access-control-allow-origin'] = determinedAllowedOrigin
    } else if (useCors) {
      responseHeaders['access-control-allow-origin'] = '*'
    }
    if (allowedMethods && allowedMethods.length > 0) {
      responseHeaders['access-control-allow-methods'] = allowedMethods.join(', ')
    } else if (useCors) {
      responseHeaders['access-control-allow-methods'] = 'GET,OPTIONS'
    }
    if (allowedHeaders && allowedHeaders.length > 0) {
      responseHeaders['access-control-allow-headers'] = allowedHeaders.join(', ')
    } else if (useCors) {
      responseHeaders['access-control-allow-headers'] = '*'
    }
    if (allowedCredentials) {
      responseHeaders['access-control-allow-credentials'] = true
    }
    if (maxAge) {
      responseHeaders['access-control-max-age'] = maxAge
    }
  }
}

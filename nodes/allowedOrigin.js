/**
 * Determines the allowed origin for CORS based on the allowed origins and the request's authority.
 *
 * @param {string[]|string} allowedOrigins - A list of allowed origins or a wildcard (`'*'`) to allow all origins.
 * @param {string} requestAuthority - The authority (origin) of the incoming request.
 * @returns {string|null} The allowed origin to be set in the CORS headers or `null` if the request origin is not allowed.
 */
export default function allowedOrigin(allowedOrigins, requestAuthority) {
  if (allowedOrigins === '*') {
    return '*'
  }
  if (requestAuthority) {
    if (allowedOrigins.indexOf(requestAuthority) !== -1) {
      return `https://${requestAuthority}`
    }
  }
  return null
}

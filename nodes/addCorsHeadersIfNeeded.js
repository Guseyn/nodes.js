import allowedOrigin from '#nodes/allowedOrigin.js'

/**
 * @param {import('./types.js').ResponseHeaders} responseHeaders
 * @param {string} requestAuthority
 * @param {import('./types.js').CorsOptions} [options]
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
  if (useCors) {
    allowedOrigins = allowedOrigins || '*'
    const determinedAllowedOrigin = allowedOrigin(
      allowedOrigins,
      requestAuthority
    )
    if (determinedAllowedOrigin) {
      responseHeaders['access-control-allow-origin'] = determinedAllowedOrigin
    } else if (useCors) {
      responseHeaders['access-control-allow-origin'] = '*'
    }
    const methodsList = Array.isArray(allowedMethods)
      ? allowedMethods
      : (allowedMethods ? [allowedMethods] : [])
    if (methodsList.length > 0) {
      responseHeaders['access-control-allow-methods'] = methodsList.join(', ')
    } else if (useCors) {
      responseHeaders['access-control-allow-methods'] = 'GET,OPTIONS'
    }
    const headersList = Array.isArray(allowedHeaders)
      ? allowedHeaders
      : (allowedHeaders ? [allowedHeaders] : [])
    if (headersList.length > 0) {
      responseHeaders['access-control-allow-headers'] = headersList.join(', ')
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

const allowedOrigin = require('./allowedOrigin')

module.exports = function addCorsHeadersIfNeeded(
  responseHeaders,
  requestOrigin,
  requestHost, {
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
      requestOrigin,
      requestHost
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
    if (allowedHeaders && allowedMethods.length > 0) {
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

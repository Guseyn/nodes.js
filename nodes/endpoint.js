module.exports = function endpoint(urlPattern, method, handler, {
  useCors,
  allowedOrigins,
  allowedMethods,
  allowedHeaders,
  allowedCredentials,
  maxAge
} = {}) {
  return {
    urlPattern,
    method,
    handler,
    allowedOrigins,
    allowedMethods,
    allowedHeaders,
    allowedCredentials,
    maxAge,
    type: 'endpoint'
  }
}

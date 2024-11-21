const addCorsHeadersIfNeeded = require('./addCorsHeadersIfNeeded')

module.exports = function corsHandler({
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
  headers['x-authority', requestAuthority]
  stream.respond(headers)
  stream.end()
}

import addCorsHeadersIfNeeded from '#nodes/addCorsHeadersIfNeeded.js'

/**
 * @param {import('./types.js').CorsHandlerOptions} options
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
    /** @type {import('./types.js').ResponseHeaders} */ (headers),
    requestAuthority, {
    useCors,
    allowedOrigins,
    allowedMethods,
    allowedHeaders,
    allowedCredentials,
    maxAge
  })
  if (requestAuthority) {
    headers['x-authority'] = requestAuthority
  }
  stream.respond(headers)
  stream.end()
}

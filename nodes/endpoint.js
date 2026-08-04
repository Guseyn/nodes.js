/**
 * Defines an endpoint configuration for a server.
 *
 * @param {string|RegExp} urlPattern
 * @param {string} method
 * @param {import('./types.js').EndpointHandlerFn} handler
 * @param {Object} [options]
 * @param {boolean} [options.useCors]
 * @param {string|string[]} [options.allowedOrigins]
 * @param {string[]} [options.allowedMethods]
 * @param {string|string[]} [options.allowedHeaders]
 * @param {boolean} [options.allowedCredentials]
 * @param {number} [options.maxAge]
 * @returns {import('./types.js').NodesEndpoint}
 */
export default function endpoint(urlPattern, method, handler, {
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
    useCors,
    allowedOrigins,
    allowedMethods,
    allowedHeaders,
    allowedCredentials,
    maxAge,
    type: 'endpoint'
  }
}

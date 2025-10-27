/**
 * Defines an endpoint configuration for a server.
 *
 * @param {string|RegExp} urlPattern - The URL pattern for the endpoint. Can be a string (e.g., `/api/resource`) 
 * or a regular expression (e.g., `/^\/api\/\w+$/`).
 * @param {string} method - The HTTP method for the endpoint (e.g., `GET`, `POST`, `PUT`, `DELETE`).
 * @param {Function} handler - The function that handles requests to the endpoint.
 * @param {Object} [options] - Optional configuration for the endpoint, including CORS settings.
 * @param {boolean} [options.useCors] - Whether to enable CORS for the endpoint.
 * @param {string|string[]} [options.allowedOrigins] - A list of allowed origins for CORS. It also can be '*'.
 * @param {string[]} [options.allowedMethods] - A list of allowed HTTP methods for CORS.
 * @param {string|string[]} [options.allowedHeaders] - A list of allowed HTTP headers for CORS. It also can be '*'.
 * @param {boolean} [options.allowedCredentials] - Whether credentials are allowed in CORS requests.
 * @param {number} [options.maxAge] - The maximum time (in seconds) that preflight CORS requests are cached.
 * @returns {Object} An object representing the endpoint configuration.
 *
 * @description
 * This function creates an endpoint configuration object for use in a server application. It supports
 * optional CORS settings and allows the URL pattern to be defined as a string or a regular expression.
 **/
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
    allowedOrigins,
    allowedMethods,
    allowedHeaders,
    allowedCredentials,
    maxAge,
    type: 'endpoint'
  }
}

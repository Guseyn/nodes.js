/**
 * Creates a configuration object for serving static resources.
 *
 * @param {string|RegExp} urlPattern - The URL pattern or regular expression for matching static resources.
 * @param {Object} [options] - Configuration options for serving static resources.
 * @param {Function} [options.mapper] - A custom function to map the request URL to a file path.
 * @param {string} [options.baseFolder] - The base folder for resolving static files.
 * @param {string} [options.fileNotFound] - Path to a file to serve when the requested file is not found.
 * @param {string} [options.fileNotAccessible] - Path to a file to serve when the requested file is inaccessible.
 * @param {boolean} [options.useGzip] - Whether to enable Gzip compression for static files.
 * @param {boolean} [options.useCache] - Whether to enable caching for static files.
 * @param {string} [options.cacheControl] - The `Cache-Control` header value for static files.
 * @param {boolean} [options.useCors] - Whether to enable Cross-Origin Resource Sharing (CORS) for static files.
 * @param {string[]} [options.allowedOrigins] - A list of allowed origins for CORS.
 * @param {string[]} [options.allowedMethods] - A list of allowed HTTP methods for CORS.
 * @param {string[]} [options.allowedHeaders] - A list of allowed HTTP headers for CORS.
 * @param {boolean} [options.allowedCredentials] - Whether to allow credentials in CORS requests.
 * @param {number} [options.maxAge] - The maximum age (in seconds) for caching static files.
 * @returns {Object} A configuration object for static resource handling.
 *
 * @description
 * This function generates a configuration object for handling static resources. The configuration can include
 * settings for file mapping, caching, compression, and CORS. It provides flexibility for custom static file handling.
 */
export default function src(urlPattern, {
  mapper,
  baseFolder,
  fileNotFound,
  fileNotAccessible,
  useGzip,
  useCache,
  cacheControl,
  useCors,
  allowedOrigins,
  allowedMethods,
  allowedHeaders,
  allowedCredentials,
  maxAge
} = {}) {
  return {
    urlPattern,
    mapper,
    baseFolder,
    fileNotFound,
    fileNotAccessible,
    useGzip,
    useCache,
    cacheControl,
    useCors,
    allowedOrigins,
    allowedMethods,
    allowedHeaders,
    allowedCredentials,
    maxAge
  }
}

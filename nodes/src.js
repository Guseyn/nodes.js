/**
 * Creates a configuration object for serving static resources.
 *
 * @param {string|RegExp} urlPattern
 * @param {Object} [options]
 * @param {function(string, string): string} [options.mapper]
 * @param {string} [options.baseFolder]
 * @param {string} [options.fileNotFound]
 * @param {string} [options.fileNotAccessible]
 * @param {boolean} [options.useGzip]
 * @param {boolean} [options.useCache]
 * @param {string} [options.cacheControl]
 * @param {boolean} [options.useCors]
 * @param {string[]} [options.allowedOrigins]
 * @param {string[]} [options.allowedMethods]
 * @param {string[]} [options.allowedHeaders]
 * @param {boolean} [options.allowedCredentials]
 * @param {number} [options.maxAge]
 * @returns {import('./types.js').NodesSrc}
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

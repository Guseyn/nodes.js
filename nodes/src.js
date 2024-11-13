module.exports = function src(urlPattern, {
  mapper,
  baseFolder,
  fileNotFound,
  fileNotAccessible,
  useGzip,
  useCache,
  cacheControl,
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
    allowedOrigins,
    allowedMethods,
    allowedHeaders,
    allowedCredentials,
    maxAge
  }
}

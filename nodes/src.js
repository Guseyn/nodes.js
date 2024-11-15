module.exports = function src(urlPattern, {
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

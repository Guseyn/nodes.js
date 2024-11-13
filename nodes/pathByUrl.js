const defaultSrcMapper = require('./defaultSrcMapper')

module.exports = function pathByUrl(requestUrl, srcMapper, baseFolder) {
  let resolvedFilePath
  if (srcMapper) {
    resolvedFilePath = srcMapper(requestUrl)
  } else {
    if (baseFolder) {
      resolvedFilePath = defaultSrcMapper(baseFolder, requestUrl)
    } else {
      resolvedFilePath = defaultSrcMapper(__dirname, requestUrl)
    }
  }
  return resolvedFilePath
}

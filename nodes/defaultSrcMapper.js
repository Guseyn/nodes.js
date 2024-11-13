const path = require('path')

module.exports = function defaultSrcMapper(baseFolder, requestUrl) {
  const parts = requestUrl.split('?')[0].split('/').filter(part => part !== '')
  return path.join(baseFolder, ...parts)
}

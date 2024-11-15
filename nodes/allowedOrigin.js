module.exports = function allowedOrigin(allowedOrigins, requestOrigin, requestHost) {
  if (allowedOrigins === '*') {
    return '*'
  }
  if (requestOrigin) {
    if (allowedOrigins.indexOf(requestOrigin) !== -1) {
      return requestOrigin
    }
  }
  return null
}
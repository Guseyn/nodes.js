module.exports = function allowedOrigin(allowedOrigins, requestAuthority) {
  if (allowedOrigins === '*') {
    return '*'
  }
  if (requestAuthority) {
    if (allowedOrigins.indexOf(requestAuthority) !== -1) {
      return `https://${requestAuthority}`
    }
  }
  return null
}

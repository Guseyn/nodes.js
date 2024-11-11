class RequestBodySizeExceededMaxSizeError extends Error {
  constructor(maxSize) {
    super(`Request body size exceeded max size(${maxSize} mb)`)
    this.name = 'RequestBodySizeExceededMaxSizeError'
  }
}

module.exports = RequestBodySizeExceededMaxSizeError

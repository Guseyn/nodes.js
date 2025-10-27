/**
 * Custom error class for handling cases where the request body size exceeds the maximum allowed size.
 *
 * @extends Error
 */
class RequestBodySizeExceededMaxSizeError extends Error {
  constructor(maxSize) {
    super(`Request body size exceeded max size(${maxSize} mb)`)
    this.name = 'RequestBodySizeExceededMaxSizeError'
  }
}

export default RequestBodySizeExceededMaxSizeError

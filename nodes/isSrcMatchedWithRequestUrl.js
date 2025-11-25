import isEndpointMatchedWithRequestUrlAndMethod from '#nodes/isEndpointMatchedWithRequestUrlAndMethod.js'

/**
 * Checks if a static resource (`src`) matches a given request URL and HTTP method.
 *
 * @param {Object} src - The static resource configuration object. Must include `urlPattern` and optionally `method`.
 * @param {string} requestUrl - The URL of the incoming request.
 * @param {string} requestMethod - The HTTP method of the incoming request (e.g., `GET`, `POST`, `OPTIONS`).
 * @returns {boolean} `true` if the static resource matches the request URL and method, otherwise `false`.
 */
export default function isSrcMatchedWithRequestUrl(src, requestUrl, requestMethod) {
  return isEndpointMatchedWithRequestUrlAndMethod(src, requestUrl, requestMethod)
}

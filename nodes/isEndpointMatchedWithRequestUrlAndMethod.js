/**
 * Checks if an endpoint matches a given request URL and HTTP method.
 *
 * @param {Object} endpoint - The endpoint object containing method, URL pattern, and optional CORS settings.
 * @param {string} requestUrl - The URL of the incoming request.
 * @param {string} requestMethod - The HTTP method of the incoming request (e.g., `GET`, `POST`, `OPTIONS`).
 * @returns {boolean} `true` if the endpoint matches the request URL and method, otherwise `false`.
 *
 * @description
 * This function determines whether a given request matches an endpoint based on:
 * - The HTTP method.
 * - The URL pattern.
 * - Whether the endpoint supports CORS.
 */
export default function isEndpointMatchedWithRequestUrlAndMethod(endpoint, requestUrl, requestMethod) {
  let match = false
  if (endpoint.method && requestMethod) {
    endpoint.method = endpoint.method.trim()
    const isEndpointCors = endpoint.useCors || endpoint.allowedOrigins !== undefined
    if (isEndpointCors) {
      endpoint.method += ',OPTIONS'
    }
    const methodIsIncluded = endpoint.method.split(',').filter(t => t.trim() === requestMethod).length > 0
    match = methodIsIncluded && matchUrlPattern(endpoint.urlPattern, requestUrl)
  } else {
    match = matchUrlPattern(endpoint.urlPattern, requestUrl)
  }
  return match
}

function matchUrlPattern(pattern, url) {
  if (pattern instanceof RegExp) {
    return pattern.test(url)
  }
  const patternParts = pattern.split('?')
  const patternPathParts = patternParts[0].split('/').filter(p => p !== '')
  const patternQueryParts = patternParts[1] ? patternParts[1].split('&').filter(p => p !== '') : []

  const urlParts = url.split('?')
  const urlPathParts = urlParts[0].split('/').filter(p => p !== '')
  const urlQueryParts = urlParts[1] ? urlParts[1].split('&').filter(p => p !== '') : []

  if (patternPathParts.length !== urlPathParts.length) {
    return false
  }

  for (let i = 0; i < patternPathParts.length; i++) {
    const patternPathPart = patternPathParts[i]
    const urlPathPart = urlPathParts[i]
    
    if (patternPathPart.startsWith(':')) {
      continue
    }
    
    if (patternPathPart === '*') {
      continue
    }
    
    if (patternPathPart !== urlPathPart) {
      return false
    }
  }
  return true
}

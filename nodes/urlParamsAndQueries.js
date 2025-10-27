/**
 * Extracts parameters and query values from a URL based on a specified pattern.
 *
 * @param {string|RegExp} pattern - The URL pattern to match. If it's a string, it may include parameter placeholders (e.g., `:id`).
 * @param {string} url - The actual URL to extract parameters and queries from.
 * @returns {Object} An object containing `params` and `queries` extracted from the URL.
 * @property {Object} params - An object mapping parameter names to their values.
 * @property {Object} queries - An object mapping query keys to their values.
 *
 * @description
 * This function parses a URL based on a given pattern and extracts:
 * - Path parameters: Identified by `:` in the pattern (e.g., `/user/:id`).
 * - Query values: Based on matching keys in the query string.
 *
 * ### Example Usage
 * ```javascript
 * const urlParamsAndQueries = require('./urlParamsAndQueries');
 *
 * const pattern = '/user/:id?name';
 * const url = '/user/123?name=John';
 *
 * const { params, queries } = urlParamsAndQueries(pattern, url);
 * console.log(params); // { id: '123' }
 * console.log(queries); // { name: 'John' }
 * ```
 */
export default function urlParamsAndQueries(pattern, url) {
  const params = {}
  const queries = {}

  if (!(pattern instanceof RegExp)) {
    const patternParts = pattern.split('?')
    const patternPathParts = patternParts[0].split('/').filter(p => p !== '')
    const patternQueryParts = patternParts[1] ? patternParts[1].split('&').filter(p => p !== '') : []

    const urlParts = url.split('?')
    const urlPathParts = urlParts[0].split('/').filter(p => p !== '')
    const urlQueryParts = urlParts[1] ? urlParts[1].split('&').filter(p => p !== '') : []

    for (let i = 0; i < patternPathParts.length; i++) {
      const patternPathPart = patternPathParts[i]
      const urlPathPart = urlPathParts[i]
      
      if (patternPathPart.startsWith(':') && patternPathPart.length > 1) {
        params[patternPathPart.split(':')[1]] = urlPathPart
      }
    }

    for (let i = 0; i < patternQueryParts.length; i++) {
      const patternQueryPart = patternQueryParts[i]
      const urlQueryPart = urlQueryParts
        .find(urlQueryPart => urlQueryPart.split('=')[0] === patternQueryPart)
      
      if (urlQueryPart !== undefined && urlQueryPart !== null) {
        const urlQueryPartKeyAndValue = urlQueryPart.split('=')
        const urlQueryPartKey = urlQueryPartKeyAndValue[0]
        const urlQueryPartValue = urlQueryPartKeyAndValue[1]
        if (urlQueryPartKey === patternQueryPart && urlQueryPartValue) {
          queries[patternQueryPart] = urlQueryPartValue
        }
      }
    }
  } else {
    const [urlPath, queryString] = url.split('?')
    if (queryString) {
      const searchParams = new URLSearchParams(queryString)
      for (const [key, value] of searchParams.entries()) {
        queries[key] = value
      }
    }
  }
  
  return {
    params,
    queries
  }
}
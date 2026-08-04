/**
 * @param {string|RegExp} pattern
 * @param {string} url
 * @returns {{ params: import('./types.js').UrlParams, queries: import('./types.js').UrlQueries }}
 */
export default function urlParamsAndQueries(pattern, url) {
  /** @type {import('./types.js').UrlParams} */
  const params = {}
  /** @type {import('./types.js').UrlQueries} */
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
    const [_urlPath, queryString] = url.split('?')
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
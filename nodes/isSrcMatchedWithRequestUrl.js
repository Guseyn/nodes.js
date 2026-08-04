import isEndpointMatchedWithRequestUrlAndMethod from '#nodes/isEndpointMatchedWithRequestUrlAndMethod.js'

/** @param {import('./types.js').NodesSrc} src @param {string} requestUrl @param {string} requestMethod @returns {boolean} */
export default function isSrcMatchedWithRequestUrl(src, requestUrl, requestMethod) {
  return isEndpointMatchedWithRequestUrlAndMethod(src, requestUrl, requestMethod)
}

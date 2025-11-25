import defaultSrcMapper from '#nodes/defaultSrcMapper.js'

/**
 * Resolves the file path for a given request URL using a source mapper or a base folder.
 *
 * @param {string} requestUrl - The URL of the incoming request.
 * @param {Function} [srcMapper] - A custom function to map the request URL to a file path.
 * @param {string} [baseFolder] - The base folder to use if no `srcMapper` is provided. Defaults to `__dirname`.
 * @returns {string} The resolved file path.
 *
 * @description
 * This function determines the file path for a request by:
 * 1. Using a provided `srcMapper` function, if available.
 * 2. Falling back to the `defaultSrcMapper` with the specified `baseFolder`.
 * 3. Using `__dirname` as the default base folder if none is specified.
 */
export default function pathByUrl(requestUrl, srcMapper, baseFolder) {
  let resolvedFilePath
  if (srcMapper) {
    resolvedFilePath = srcMapper(requestUrl)
  } else {
    if (baseFolder) {
      resolvedFilePath = defaultSrcMapper(baseFolder, requestUrl)
    } else {
      resolvedFilePath = defaultSrcMapper(__dirname, requestUrl)
    }
  }
  return resolvedFilePath
}

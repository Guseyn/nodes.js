import path from 'path'

/**
 * Maps a request URL to a file path within a base folder.
 *
 * @param {string} baseFolder - The base folder where files are located.
 * @param {string} requestUrl - The requested URL to be mapped to a file path.
 * @returns {string} The resolved file path based on the base folder and request URL.
 *
 * @description
 * This function maps a given request URL to a corresponding file path within a specified base folder.
 * It removes query parameters from the URL and splits the path into parts, joining them with the base folder.
 *
 * ### Example
 * ```javascript
 * const filePath = defaultSrcMapper('/var/www', '/images/photo.jpg?size=large');
 * console.log(filePath); // Outputs: '/var/www/images/photo.jpg'
 * ```
 */
export default function defaultSrcMapper(baseFolder, requestUrl) {
  const parts = requestUrl
    .split('?')[0]
    .split('/')
    .filter(part => part !== '')
    .map(part => decodeURIComponent(part))
  return path.join(baseFolder, ...parts)
}

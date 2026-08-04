/** @param {import('./types.js').StreamHandlerOptions} options @returns {Promise<void>} */
export default async function defaultSrcNotAccessibleHandler({
  stream
}) {
  stream.respond({
    'content-type': 'text/plain',
    ':status': 403
  })
  stream.end('404 Not Accessible')
}

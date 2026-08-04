/** @param {import('./types.js').StreamHandlerOptions} options @returns {Promise<void>} */
export default async function defaultSrcNotFoundHandler({ stream }) {
  const body = '404 Not Found'
  stream.respond({
    'content-type': 'text/plain; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    ':status': 404
  })
  stream.end(body)
}

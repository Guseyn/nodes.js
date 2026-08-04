/** @param {import('./types.js').StreamHandlerOptions} options @returns {Promise<void>} */
export default async function defaultEndpointNotAllowedHandler({
  stream
}) {
  stream.respond({
    'content-type': 'text/plain',
    ':status': 405
  })
  stream.end('405 Not Allowed')
}

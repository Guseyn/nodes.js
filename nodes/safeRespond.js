/**
 * @param {{ destroyed: any; closed: any; respond: (arg0: { ':status': any; 'content-type': string; }) => void; end: (arg0: string) => void; }} stream
 * @param {any} status
 * @param {any} data
 */
export default function safeRespond(stream, status, data) {
  if (stream.destroyed || stream.closed) {
    return
  }
  stream.respond({
    ':status': status,
    'content-type': 'application/json'
  })
  stream.end(JSON.stringify(data))
}

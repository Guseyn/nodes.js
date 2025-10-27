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

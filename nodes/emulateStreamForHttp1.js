import { Duplex } from 'stream'

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @returns {import('./types.js').NodesRequestStream}
 */
export default function emulateStreamForHttp1(req, res) {
  const stream = new Duplex({
    read() {},

    write(chunk, encoding, callback) {
      res.write(chunk, encoding, callback)
    },

    final(callback) {
      res.end()
      callback()
    }
  })

  req.on('data', (chunk) => {
    stream.push(chunk)
  })

  req.on('end', () => {
    stream.push(null)
  })

  const headers = /** @type {import('./types.js').RequestHeaders} */ ({
    ':method': req.method || '',
    ':path': req.url || '',
    ':authority': req.headers.host || ''
  })

  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      headers[key] = value
    }
  }

  for (const key of [
    'connection',
    'host',
    'origin',
    'upgrade',
    'keep-alive',
    'proxy-connection',
    'transfer-encoding',
    'upgrade-insecure-requests'
  ]) {
    delete headers[key]
  }

  /** @type {import('./types.js').NodesRequestStream} */
  const emulatedStream = /** @type {import('./types.js').NodesRequestStream} */ (/** @type {unknown} */ (stream))
  emulatedStream.headers = headers
  emulatedStream.respond = (responseHeaders) => {
    const status = responseHeaders[':status'] || 200
    if (headers[':authority']) {
      responseHeaders['x-authority'] = headers[':authority']
    }
    delete responseHeaders[':status']
    delete responseHeaders[':method']
    delete responseHeaders[':path']
    delete responseHeaders[':scheme']
    responseHeaders['x-handled-by-http1-stream-emulation'] = true
    res.writeHead(status, responseHeaders)
  }
  emulatedStream.setTimeout = (ms, callback) => {
    res.setTimeout(ms, callback)
  }
  emulatedStream.pushStream = (_headers, callback) => {
    if (callback) {
      callback(new Error('Server push is not supported in HTTP/1.1'))
    }
  }

  return emulatedStream
}

import { Duplex } from 'stream'

/**
 * Emulates an HTTP/2-like stream for HTTP/1.1 requests and responses.
 *
 * @param {Object} req - The HTTP/1.1 request object.
 * @param {Object} res - The HTTP/1.1 response object.
 * @returns {Duplex} A Duplex stream that emulates an HTTP/2-like stream interface.
 *
 * @description
 * This function creates a Duplex stream that bridges the gap between HTTP/1.1 and an HTTP/2-like API.
 * It allows handling HTTP/1.1 requests and responses using a stream-like interface commonly used with HTTP/2.
 *
 * ### Key Features:
 * - Implements a readable stream from the incoming `req` data.
 * - Implements a writable stream to the `res` object.
 * - Provides HTTP/2-style headers (`:method`, `:path`, etc.).
 * - Handles `respond` and `pushStream` methods for API compatibility.
 *
 * ### Example Usage
 * ```javascript
 * const http = require('http');
 * const emulateStreamForHttp1 = require('./emulateStreamForHttp1');
 *
 * const server = http.createServer((req, res) => {
 *   const stream = emulateStreamForHttp1(req, res);
 *   stream.on('data', (chunk) => {
 *     console.log('Received chunk:', chunk.toString());
 *   });
 *   stream.respond({
 *     ':status': 200,
 *     'content-type': 'text/plain'
 *   });
 *   stream.end('Hello, world!');
 * });
 *
 * server.listen(3000, () => {
 *   console.log('Server running on http://localhost:3000');
 * });
 * ```
 */
export default function emulateStreamForHttp1(req, res) {
  const stream = new Duplex({
    // Implement the readable side (data coming from req)
    read() {},

    // Implement the writable side (data going to res)
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
    stream.push(null) // Signal end of stream
  })

  const headers = {
    ':method': req.method,
    ':path': req.url,
    ':authority': req.headers.host,
    ...req.headers
  }

  // Just to avoid confusion in unified API, let's delete HTTP/1 specific headers
  delete headers['connection']
  delete headers['host']
  delete headers['origin']
  delete headers['upgrade']
  delete headers['keep-alive']
  delete headers['proxy-connection']
  delete headers['transfer-encoding']
  delete headers['upgrade-insecure-requests']

  stream.headers = headers
  stream.respond = (responseHeaders) => {
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
  stream.setTimeout = (ms, callback) => {
    res.setTimeout(ms, callback)
  }
  stream.pushStream = (headers, callback) => {
    if (callback) {
      callback(new Error('Server push is not supported in HTTP/1.1'))
    }
  }

  return stream
}

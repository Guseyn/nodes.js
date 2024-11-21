const { Duplex } = require('stream')

module.exports = function emulateStreamForHttp1(req, res) {
  const stream = new Duplex({
    // Implement the readable side (data coming from req)
    read() {
      req.on('data', (chunk) => {
        this.push(chunk)
      })

      req.on('end', () => {
        this.push(null) // Signal end of stream
      })
    },

    // Implement the writable side (data going to res)
    write(chunk, encoding, callback) {
      res.write(chunk, encoding, callback)
    },

    final(callback) {
      res.end()
      callback()
    }
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
    responseHeaders['x-authority'] = headers[':authority']
    delete responseHeaders[':status']
    delete responseHeaders[':method']
    delete responseHeaders[':path']
    delete responseHeaders[':scheme']
    responseHeaders['x-handled-by-http1-stream-emulation'] = true
    res.writeHead(status, responseHeaders)
  }
  stream.write = (chunk) => {
    res.write(chunk)
  }
  stream.end = (data) => {
    res.end(data)
  }
  stream.destroy = (error) => {
    if (error) {
      res.destroy(error)
    } else {
      res.destroy()
    }
  }
  stream.setTimeout = (ms, callback) => {
    res.setTimeout(ms, callback)
  }
  stream.on = (event, handler) => {
    res.on(event, handler)
  }
  stream.pushStream = (headers, callback) => {
    if (callback) {
      callback(new Error('Server push is not supported in HTTP/1.1'))
    }
  }

  return stream
}

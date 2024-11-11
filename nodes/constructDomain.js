const cluster = require('cluster')
const domain = require('domain')

const TIME_TO_EXIT_PROCESS = 30000

const ERROR_CODES_TO_IGNORE = [ 'EPIPE', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED' ]

module.exports = function constructDomain(server, stream) {
  const d = domain.create()
  d.on('error', (err) => {
    try {
      if (ERROR_CODES_TO_IGNORE.indexOf(err.code) === -1) {
        stream.respond({
          'content-type': 'text/plain',
          'status': 500
        })
        stream.end(err.stack)
        const killtimer = setTimeout(() => {
          process.exit(1)
        }, TIME_TO_EXIT_PROCESS)
        killtimer.unref()
        server.close()
        if (cluster.worker.process.connected) {
          cluster.worker.disconnect()
        }
      }
    } catch (err2) {
      throw err2
    }
  })
  d.add(stream)
  return d
}

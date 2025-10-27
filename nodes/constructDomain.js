import cluster from 'cluster'
import domain from 'domain'

const TIME_TO_EXIT_PROCESS = 30000

const ERROR_CODES_TO_IGNORE = [ 'EPIPE', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED' ]

/**
 * Constructs a domain to handle errors for a specific stream in a server context.
 *
 * @param {Object} server - The server instance to be closed if a non-ignorable error occurs.
 * @param {Object} stream - The HTTP/2 or HTTP/1.x stream object associated with the request.
 * @returns {Domain} A domain instance to manage errors for the stream.
 *
 * @description
 * This function creates a domain to manage errors occurring in the provided stream. If an error
 * occurs and its code is not in the `ERROR_CODES_TO_IGNORE` list, the server will be shut down,
 * the process will exit after a timeout, and the error stack will be sent in the response.
 *
 * ### Error Handling
 * - Errors with codes in `ERROR_CODES_TO_IGNORE` are ignored.
 * - Non-ignorable errors:
 *   - Respond with status 500 and the error stack.
 *   - Close the server.
 *   - Disconnect the cluster worker (if applicable).
 *   - Exit the process after a timeout.
 */
export default function constructDomain(server, stream) {
  const d = domain.create()
  d.on('error', (err) => {
    try {
      global.log(err)
      if (ERROR_CODES_TO_IGNORE.indexOf(err.code) === -1) {
        if (
          !stream.closed &&
          !stream.destroyed && 
          !stream.writableEnded && 
          !stream.aborted
        ) {
          stream.respond({
            'content-type': 'text/plain',
            'status': 500
          })
          stream.end(err.stack)
        }
        const killtimer = setTimeout(() => {
          process.exit(1)
        }, TIME_TO_EXIT_PROCESS)
        killtimer.unref()
        server.close()
        if (cluster.worker.process.connected) {
          cluster.worker.disconnect()
          setTimeout(() => cluster.worker.kill(), 5000)
        }
      }
    } catch (err2) {
      throw err2
    }
  })
  d.add(stream)
  return d
}

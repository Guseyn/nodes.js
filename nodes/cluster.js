const os = require('os')
const path = require('path')
const cluster = require('cluster')
const fs = require('fs')

const readSecrets = require('./readSecrets')
const setupFileLogging = require('./setupFileLogging')
const disconnectAndExitAllWorkersWithTimeoutRecursively = require('./disconnectAndExitAllWorkersWithTimeoutRecursively')

/**
 * Creates and manages a cluster of worker processes.
 *
 * @param {string} primaryScript - The relative path to the primary script to be executed by the master process.
 * @param {string} workerScript - The relative path to the worker script to be executed by worker processes.
 * @returns {Function} A function that initializes the cluster and manages worker processes.
 */
module.exports = function clusterRunner(primaryScript, workerScript) {
  /**
   * Initializes the cluster, sets up workers, and manages their lifecycle.
   *
   * @param {Object} options - The configuration options for the cluster.
   * @param {number} [options.numberOfWorkers=os.cpus().length] - The number of worker processes to spawn. Defaults to the number of CPU cores.
   * @param {number} options.restartTime - The timeout (in milliseconds) before restarting workers after a graceful shutdown.
   * @param {Object} options.config - Configuration object to be passed to workers and the primary process.
   * @param {string} [options.logFile] - The path to the log file for storing logs. If undefined, logs are sent to the console.
   * @returns {Promise<void>} A promise that resolves when the cluster is fully initialized.
   */
  return async ({
    numberOfWorkers,
    restartTime,
    config,
    logFile
  }) => {
    numberOfWorkers = numberOfWorkers || os.cpus().length
    if (cluster.isPrimary) {
      fs.writeFileSync('primary.pid', process.pid.toString(), 'utf8')

      await readSecrets(config || {})

      global.log = console.log
      if (logFile !== undefined) {
        setupFileLogging(logFile)
      }

      const primaryScriptPath = path.join(process.cwd(), primaryScript)
      global.config = config
      require(primaryScriptPath)
      
      for (let i = 0; i < numberOfWorkers; i++) {
        cluster.fork({ CONFIG: JSON.stringify(config), USE_FILE_LOGGING: logFile !== undefined })
      }

      cluster.on('exit', (worker, code, signal) => {
        if (signal === 'SIGINT') {
          global.log(`worker ${worker.process.pid} died (${signal || code}). exiting...`)
          process.exit()
        } else {
          global.log(`worker ${worker.process.pid} died (${signal || code}). restarting...`)
          cluster.fork({ CONFIG: JSON.stringify(config), USE_FILE_LOGGING: logFile !== undefined })  
        }
      })

      process.on('SIGINT', () => {
        fs.unlinkSync('primary.pid')
        process.exit()
      })

      process.on('SIGUSR1', () => {
        const allWorkers = Object.values(cluster.workers)
        disconnectAndExitAllWorkersWithTimeoutRecursively(allWorkers, 0, restartTime, (error, allWorkers) => {
          if (error) {
            global.log(error)
          }
          // To be sure message will be dispalyed after all workers are restarted.
          global.log('All workers are restarted successfully (gracefully and recursively with timeout).')
        })
      })

    } else {
      global.config = JSON.parse(process.env.CONFIG || '{}')
      global.log = console.log
      if (process.env.USE_FILE_LOGGING === 'true') {
        setupFileLogging(logFile)
      }
      const workerScriptPath = path.join(process.cwd(), workerScript)
      require(workerScriptPath)
    }
  }
}


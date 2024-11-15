const os = require('os')
const path = require('path')
const cluster = require('cluster')
const fs = require('fs')

const readSecrets = require('./readSecrets')
const setupFileLogging = require('./setupFileLogging')
const disconnectAndExitAllWorkersWithTimeoutRecursively = require('./disconnectAndExitAllWorkersWithTimeoutRecursively')

module.exports = function clusterRunner(primaryScript, workerScript) {
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


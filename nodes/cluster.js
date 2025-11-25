import os from 'os'
import path from 'path'
import cluster from 'cluster'
import fs from 'fs'

import readSecrets from '#nodes/readSecrets.js'
import setupFileLogging from '#nodes/setupFileLogging.js'
import disconnectAndExitAllWorkersWithTimeoutRecursively from '#nodes/disconnectAndExitAllWorkersWithTimeoutRecursively.js'

/**
 * Creates and manages a cluster of worker processes.
 *
 * @param {string} primaryScript - The relative path to the primary script to be executed by the master process.
 * @param {string} workerScript - The relative path to the worker script to be executed by worker processes.
 * @returns {Function} A function that initializes the cluster and manages worker processes.
 */
export default function clusterRunner(primaryScript, workerScript) {
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

      setupFileLogging(logFile)

      const primaryScriptPath = path.join(process.cwd(), primaryScript)
      global.config = config
      await import(primaryScriptPath)
      
      for (let i = 0; i < numberOfWorkers; i++) {
        const timeInBetween = 250
        setTimeout(() => {
          cluster.fork({ CONFIG: JSON.stringify(config) })
        }, i * timeInBetween)
      }

      let lastRestart = 0
      const restartCooldownMs = 1_000

      cluster.on('exit', (worker, code, signal) => {
        if (signal === 'SIGINT') {
          global.log(`💀 worker ${worker.process.pid} died (${signal || code}). exiting...`)
        } else {
          const now = Date.now()
          if (now - lastRestart < restartCooldownMs) {
            global.log('Restart suppressed to avoid loop.')
            process.exit()
            return
          }
          lastRestart = now
          global.log(`♻️ worker ${worker.process.pid} died (${signal || code}). restarting...`)
          cluster.fork({ CONFIG: JSON.stringify(config) })  
        }
      })

      process.on('SIGINT', () => {
        const checkInterval = 500 // ms
        const pidFile = 'primary.pid'

        const interval = setInterval(() => {
          const allWorkers = Object.values(cluster.workers)
          if (allWorkers.length === 0) {
            clearInterval(interval)
            global.log('🧘 All workers are shut down (gracefully and recursively with timeout).')
            try {
              fs.unlinkSync(pidFile)
            } catch {}
            process.exit(0)
          }
        }, checkInterval)
      })

      process.on('SIGUSR1', () => {
        const allWorkers = Object.values(cluster.workers)
        disconnectAndExitAllWorkersWithTimeoutRecursively(allWorkers, 0, restartTime, (error, allWorkers) => {
          if (error) {
            global.log(error)
          }
          global.log('🧘 All workers are restarted (gracefully and recursively with timeout).')
        })
      })

      process.on('uncaughtException', async (err) => {
        global.log('Uncaught Exception in primary:', err)
      })

      process.on('unhandledRejection', async (reason) => {
        global.log('Unhandled Rejection in primary:', reason)
      })

    } else {
      setTimeout(async function() {
        global.config = JSON.parse(process.env.CONFIG || '{}')
        setupFileLogging(logFile)
        const workerScriptPath = path.join(process.cwd(), workerScript)
        await import(workerScriptPath)
      }, 5_000);
    }
  }
}


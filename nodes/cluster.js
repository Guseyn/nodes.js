import os from 'os'
import path from 'path'
import cluster from 'cluster'
import fs from 'fs'

import readSecrets from '#nodes/readSecrets.js'
import setupFileLogging, { logSymbols } from '#nodes/setupFileLogging.js'
import disconnectAndExitAllWorkersWithTimeoutRecursively from '#nodes/disconnectAndExitAllWorkersWithTimeoutRecursively.js'
import runtime from '#nodes/runtime.js'

/**
 * Creates and manages a cluster of worker processes.
 *
 * @param {string} primaryScript
 * @param {string} workerScript
 * @returns {function(import('./types.js').ClusterOptions): Promise<void>}
 */
export default function clusterRunner(primaryScript, workerScript) {
  /**
   * @param {import('./types.js').ClusterOptions} options
   * @returns {Promise<void>}
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
      runtime.config = config
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
          runtime.log(`${logSymbols.err} worker ${worker.process.pid} died (${signal || code}). exiting...`)
        } else {
          const now = Date.now()
          if (now - lastRestart < restartCooldownMs) {
            runtime.log('Restart suppressed to avoid loop.')
            process.exit()
            return
          }
          lastRestart = now
          runtime.log(`${logSymbols.retry} worker ${worker.process.pid} died (${signal || code}). restarting...`)
          cluster.fork({ CONFIG: JSON.stringify(config) })  
        }
      })

      process.on('SIGINT', () => {
        const checkInterval = 500 // ms
        const pidFile = 'primary.pid'

        const interval = setInterval(() => {
          // @ts-ignore
          const allWorkers = Object.values(cluster.workers)
          if (allWorkers.length === 0) {
            clearInterval(interval)
            runtime.log(`${logSymbols.ok} All workers are shut down (gracefully and recursively with timeout).`)
            try {
              fs.unlinkSync(pidFile)
            } catch {}
            process.exit(0)
          }
        }, checkInterval)
      })

      process.on('SIGUSR1', () => {
        // @ts-ignore
        const allWorkers = Object.values(cluster.workers)
        // @ts-ignore
        disconnectAndExitAllWorkersWithTimeoutRecursively(allWorkers, 0, restartTime, (error, allWorkers) => {
          if (error) {
            runtime.log(error)
          }
          runtime.log(`${logSymbols.ok} All workers are restarted (gracefully and recursively with timeout).`)
        })
      })

      process.on('uncaughtException', async (err) => {
        runtime.log('Uncaught Exception in primary:', err)
      })

      process.on('unhandledRejection', async (reason) => {
        runtime.log('Unhandled Rejection in primary:', reason)
      })

    } else {
      setTimeout(async function() {
        runtime.config = JSON.parse(process.env.CONFIG || '{}')
        setupFileLogging(logFile)
        const workerScriptPath = path.join(process.cwd(), workerScript)
        await import(workerScriptPath)
      }, 5_000);
    }
  }
}

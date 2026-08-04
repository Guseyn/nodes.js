const TIME_TO_EXIT_PROCESS = 10

/**
 * @typedef {import('cluster').Worker} ClusterWorker
 */

/**
 * Recursively disconnects and exits all workers in a cluster with a specified timeout.
 *
 * @param {(ClusterWorker|null|undefined)[]} allWorkers - An array of all cluster worker objects.
 * @param {number} currentWorkerIndex - The current index of the worker being processed.
 * @param {number} restartTime - The timeout (in seconds) before disconnecting the next worker. Defaults to `TIME_TO_EXIT_PROCESS` if not provided.
 * @param {function(Error|null, ClusterWorker[]|null): void} callback
 *
 * @description
 * This function recursively disconnects and exits each worker in the `allWorkers` array. It ensures each worker is given a message to exit, then disconnects it.
 * A timeout is applied between processing each worker, allowing them to exit gracefully before the next worker is processed.
 *
 * If all workers are processed without errors, the `callback` is invoked with the `allWorkers` array.
 * If an error occurs during processing, the `callback` is invoked with the error and `null`.
 */
export default function disconnectAndExitAllWorkersWithTimeoutRecursively(
  allWorkers,
  currentWorkerIndex,
  restartTime,
  callback
) {
  if (currentWorkerIndex < allWorkers.length) {
    const currentWorker = allWorkers[currentWorkerIndex]
    if (!currentWorker) {
      disconnectAndExitAllWorkersWithTimeoutRecursively(
        allWorkers,
        currentWorkerIndex + 1,
        restartTime,
        callback
      )
      return
    }
    if (currentWorker.process.connected) {
      try {
        setTimeout(() => {
          try {
            disconnectAndExitAllWorkersWithTimeoutRecursively(
              allWorkers,
              currentWorkerIndex + 1,
              restartTime,
              callback
            )
          } catch (error) {
            callback(toError(error), null)
          }
        }, (restartTime || TIME_TO_EXIT_PROCESS) * 1000)
        currentWorker.disconnect()
        setTimeout(() => currentWorker.kill(), 5000)
      } catch (error) {
        callback(toError(error), null)
      }
    }
  } else {
    callback(null, /** @type {ClusterWorker[]} */ (allWorkers.filter(Boolean)))
  }
}

/**
 * @param {unknown} error
 * @returns {Error}
 */
function toError(error) {
  return error instanceof Error ? error : new Error(String(error))
}

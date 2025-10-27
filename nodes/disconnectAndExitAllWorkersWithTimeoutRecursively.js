const TIME_TO_EXIT_PROCESS = 10

/**
 * Recursively disconnects and exits all workers in a cluster with a specified timeout.
 *
 * @param {Object[]} allWorkers - An array of all cluster worker objects.
 * @param {number} currentWorkerIndex - The current index of the worker being processed.
 * @param {number} restartTime - The timeout (in seconds) before disconnecting the next worker. Defaults to `TIME_TO_EXIT_PROCESS` if not provided.
 * @param {Function} callback - A callback function to be invoked after all workers are processed or an error occurs.
 * @param {Error|null} callback.error - An error object if an error occurred; otherwise, `null`.
 * @param {Object[]|null} callback.allWorkers - The array of all workers if the process completes successfully; otherwise, `null`.
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
            callback(error, null)
          }
        }, (restartTime || TIME_TO_EXIT_PROCESS) * 1000)
        currentWorker.disconnect()
        setTimeout(() => currentWorker.kill(), 5000)
      } catch (error) {
        callback(error, null)
      }
    }
  } else {
    callback(null, allWorkers)
  }
}

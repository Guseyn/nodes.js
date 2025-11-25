/**
 * Runs a single cron-like job on a recurring interval.
 *
 * @param {Object} job - Job definition.
 * @param {string} job.name - Name of the job for logging.
 * @param {number} job.everyMins - Frequency in minutes.
 * @param {Function} job.fn - Async or sync function to run.
 * @param {Object} job.deps - Dependencies passed to job.fn.
 * @param {boolean} job.runOnStart - If true, run immediately on startup.
 *
 * @param {boolean} isStart - Internal flag to indicate initial run.
 * @param {Function} log - Logging function (defaults to console.log).
 */
async function runJob(job, isStart = false, log = console.log) {
  const { name, everyMins, fn, deps, runOnStart } = job

  if (isStart && runOnStart) {
    log(`⏳ [${name}] Running at startup...`)
    try {
      await fn(deps)
    } catch (err) {
      log(`❌ [${name}] Error during startup run:`, err)
    }
  }

  setTimeout(async function runner() {
    log(`▶ [${name}] Executing job...`)
    try {
      await fn(deps)
      log(`✅ [${name}] Job completed.`)
    } catch (err) {
      log(`❌ [${name}] Job failed:`, err)
    }

    runJob(job, false, log) // schedule next run
  }, everyMins * 60 * 1000)
}

/**
 * Registers and starts multiple cron-like jobs.
 *
 * @param {Array<Object>} jobs - List of job definitions.
 * @param {Function} [log=console.log] - Optional logging function.
 */
async function registerJobs(jobs, log = console.log) {
  for (const job of jobs) {
    log(`🧩 Registering job: ${job.name} (every ${job.everyMins} minutes)`);
    await runJob(job, true, log)
  }
}

export default registerJobs

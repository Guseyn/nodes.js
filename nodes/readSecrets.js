import readline from 'readline/promises'


/**
 * Prompts the user to provide values for specific placeholders (`<cli>`) in a configuration object.
 *
 * @param {Object} config - The configuration object that may contain placeholders (`<cli>`).
 * @returns {Promise<void>} A promise that resolves when all secrets have been provided and the configuration is updated.
 *
 * @description
 * This function recursively traverses a configuration object, identifies any properties with the value `<cli>`,
 * and prompts the user to provide a value for each. The provided values are then set in the configuration object.
 */
export default async function readSecrets(config) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  })

  await iterateObjectRecursively(config, async (key, value, path) => {
    if (value === '<cli>') {
      const secret = await rl.question(`\x1b[36mPlease, provide a value for \x1b[0m\x1b[38;5;214m"${path.join('.')}":\x1b[0m`)
      setValueAtPath(config, path, secret)
    }
  })

  rl.close()
}

/**
 * Recursively iterates over an object, invoking a callback for each key-value pair.
 *
 * @param {Object|Array} obj - The object or array to iterate over.
 * @param {Function} callback - The callback function invoked for each key-value pair.
 * @param {Array} [path=[]] - The current path within the object (used internally for recursion).
 * @returns {Promise<void>} A promise that resolves when all iterations are complete.
 *
 * @callback callback
 * @param {string|number} key - The current key or index being processed.
 * @param {*} value - The value associated with the key.
 * @param {Array} path - The path to the current key-value pair within the object.
 */
async function iterateObjectRecursively(obj, callback, path = []) {
  if (Array.isArray(obj)) {
    for (let index = 0; index < obj.length; index++) {
      const value = obj[index]
      const currentPath = [...path, index]
      if (typeof value === 'object' && value !== null) {
        await iterateObjectRecursively(value, callback, currentPath)
      } else {
        await callback(index, value, currentPath)
      }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = [...path, key]
      if (typeof value === 'object' && value !== null) {
        await iterateObjectRecursively(value, callback, currentPath)
      } else {
        await callback(key, value, currentPath)
      }
    }
  }
}

function setValueAtPath(obj, path, newValue) {
  let current = obj

  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    
    if (!(key in current)) {
      throw new Error(`${path} is not in the obj`)
    }

    current = current[key]
  }

  const lastKey = path[path.length - 1]
  current[lastKey] = newValue
}

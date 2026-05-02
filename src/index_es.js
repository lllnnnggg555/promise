const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

const asyncRun = (() => {
  if (typeof queueMicrotask === 'function') {
    return queueMicrotask
  }

  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
    const queue = []
    let toggle = 0
    const node = document.createTextNode('')

    new MutationObserver(() => {
      const callbacks = queue.slice()
      queue.length = 0

      for (let i = 0; i < callbacks.length; i++) {
        callbacks[i]()
      }
    }).observe(node, { characterData: true })

    return (callback) => {
      queue.push(callback)
      toggle = (toggle + 1) % 2
      node.data = String(toggle)
    }
  }

  return (callback) => {
    setTimeout(callback, 0)
  }
})()

const isObjectOrFunction = (value) => {
  return value !== null && (typeof value === 'object' || typeof value === 'function')
}

const resolvePromise = (promise, x, resolve, reject) => {
  if (promise === x) {
    return reject(new TypeError('A promise cannot resolve itself.'))
  }

  if (x instanceof Promise) {
    return x.then(resolve, reject)
  }

  if (!isObjectOrFunction(x)) {
    return resolve(x)
  }

  let called = false
  let then

  try {
    then = x.then
  } catch (err) {
    return reject(err)
  }

  if (typeof then !== 'function') {
    return resolve(x)
  }

  try {
    then.call(
      x,
      (y) => {
        if (called) {
          return
        }
        called = true
        resolvePromise(promise, y, resolve, reject)
      },
      (r) => {
        if (called) {
          return
        }
        called = true
        reject(r)
      }
    )
  } catch (err) {
    if (called) {
      return
    }
    called = true
    reject(err)
  }
}

const flush = (promise) => {
  const callbacks = promise.callbacks
  promise.callbacks = []

  for (let i = 0; i < callbacks.length; i++) {
    handle(promise, callbacks[i])
  }
}

const handle = (promise, callback) => {
  if (promise.status === PENDING) {
    promise.callbacks.push(callback)
    return
  }

  asyncRun(() => {
    const isFulfilled = promise.status === FULFILLED
    const cb = isFulfilled ? callback.onFulfilled : callback.onRejected
    const data = isFulfilled ? promise.value : promise.reason

    if (typeof cb !== 'function') {
      isFulfilled ? callback.resolve(data) : callback.reject(data)
      return
    }

    try {
      const x = cb(data)
      resolvePromise(callback.promise, x, callback.resolve, callback.reject)
    } catch (err) {
      callback.reject(err)
    }
  })
}

export default class Promise {
  constructor(executor) {
    if (typeof executor !== 'function') {
      throw new TypeError('Promise resolver ' + executor + ' is not a function')
    }

    this.status = PENDING
    this.value = undefined
    this.reason = undefined
    this.callbacks = []

    const fulfill = (value) => {
      if (this.status !== PENDING) {
        return
      }

      this.status = FULFILLED
      this.value = value
      flush(this)
    }

    const reject = (reason) => {
      if (this.status !== PENDING) {
        return
      }

      this.status = REJECTED
      this.reason = reason
      flush(this)
    }

    const resolve = (value) => {
      if (this.status !== PENDING) {
        return
      }

      resolvePromise(this, value, fulfill, reject)
    }

    this.resolve = resolve
    this.reject = reject

    try {
      executor(resolve, reject)
    } catch (err) {
      reject(err)
    }
  }

  then(onFulfilled, onRejected) {
    let handler
    const promise2 = new Promise((resolve, reject) => {
      handler = {
        promise: null,
        onFulfilled,
        onRejected,
        resolve,
        reject
      }
    })

    handler.promise = promise2
    handle(this, handler)

    return promise2
  }

  catch(onRejected) {
    return this.then(null, onRejected)
  }

  finally(callback) {
    const PromiseConstructor = this.constructor || Promise

    return this.then(
      (value) => {
        return PromiseConstructor.resolve(typeof callback === 'function' ? callback() : callback).then(() => value)
      },
      (reason) => {
        return PromiseConstructor.resolve(typeof callback === 'function' ? callback() : callback).then(() => {
          throw reason
        })
      }
    )
  }

  static resolve(value) {
    if (value instanceof Promise) {
      return value
    }

    return new Promise((resolve) => {
      resolve(value)
    })
  }

  static reject(reason) {
    return new Promise((resolve, reject) => {
      reject(reason)
    })
  }

  static all(promises) {
    return new Promise((resolve, reject) => {
      if (!promises || typeof promises.length !== 'number') {
        return reject(new TypeError('Promise.all accepts an array-like object.'))
      }

      const length = promises.length
      const results = new Array(length)
      let remaining = length

      if (length === 0) {
        return resolve(results)
      }

      const resolver = (index) => {
        return (value) => {
          results[index] = value
          remaining -= 1

          if (remaining === 0) {
            resolve(results)
          }
        }
      }

      for (let i = 0; i < length; i++) {
        Promise.resolve(promises[i]).then(resolver(i), reject)
      }
    })
  }

  static race(promises) {
    return new Promise((resolve, reject) => {
      if (!promises || typeof promises.length !== 'number') {
        return reject(new TypeError('Promise.race accepts an array-like object.'))
      }

      for (let i = 0; i < promises.length; i++) {
        Promise.resolve(promises[i]).then(resolve, reject)
      }
    })
  }
}

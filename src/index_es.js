const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

const asyncRun = (callback) => {
  setTimeout(callback, 0)
}

const isThenable = (value) => {
  return value !== null && (typeof value === 'object' || typeof value === 'function')
}

const resolvePromise = (promise, x, resolve, reject) => {
  if (promise === x) {
    return reject(new TypeError('A promise cannot resolve itself.'))
  }

  if (x instanceof Promise) {
    return x.then(resolve, reject)
  }

  if (!isThenable(x)) {
    return resolve(x)
  }

  let called = false

  try {
    const then = x.then

    if (typeof then !== 'function') {
      return resolve(x)
    }

    then.call(
      x,
      (y) => {
        if (called) return
        called = true
        resolvePromise(promise, y, resolve, reject)
      },
      (r) => {
        if (called) return
        called = true
        reject(r)
      }
    )
  } catch (err) {
    if (called) return
    called = true
    reject(err)
  }
}

export default class Promise {
  constructor(executor) {
    if (typeof executor !== 'function') {
      throw new TypeError('Promise resolver ' + executor + ' is not a function')
    }

    this.status = PENDING
    this.value = undefined
    this.reason = undefined
    this.onFulfilledCallbacks = []
    this.onRejectedCallbacks = []

    const fulfill = (value) => {
      settle(FULFILLED, value)
    }

    const reject = (reason) => {
      settle(REJECTED, reason)
    }

    const resolve = (value) => {
      resolvePromise(this, value, fulfill, reject)
    }

    const settle = (status, data) => {
      if (this.status !== PENDING) return

      this.status = status

      const callbacks = status === FULFILLED
        ? this.onFulfilledCallbacks
        : this.onRejectedCallbacks

      if (status === FULFILLED) {
        this.value = data
      } else {
        this.reason = data
      }

      callbacks.forEach((callback) => callback())
    }

    try {
      executor(resolve, reject)
    } catch (err) {
      reject(err)
    }
  }

  then(onFulfilled, onRejected) {
    const promise2 = new Promise((resolve, reject) => {
      const runFulfilled = () => {
        asyncRun(() => {
          try {
            if (typeof onFulfilled !== 'function') {
              return resolve(this.value)
            }

            resolvePromise(promise2, onFulfilled(this.value), resolve, reject)
          } catch (err) {
            reject(err)
          }
        })
      }

      const runRejected = () => {
        asyncRun(() => {
          try {
            if (typeof onRejected !== 'function') {
              return reject(this.reason)
            }

            resolvePromise(promise2, onRejected(this.reason), resolve, reject)
          } catch (err) {
            reject(err)
          }
        })
      }

      if (this.status === FULFILLED) {
        runFulfilled()
      } else if (this.status === REJECTED) {
        runRejected()
      } else {
        this.onFulfilledCallbacks.push(runFulfilled)
        this.onRejectedCallbacks.push(runRejected)
      }
    })

    return promise2
  }

  catch(onRejected) {
    return this.then(null, onRejected)
  }

  static resolve(value) {
    return new Promise((resolve) => resolve(value))
  }

  static reject(reason) {
    return new Promise((resolve, reject) => reject(reason))
  }
}

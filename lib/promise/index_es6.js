class Promise {
  constructor (executor) {
    this.status = 'panding'
    this.value = undefined
    this.reason = undefined

    this.onResolveCallback = []
    this.onRejectCallback = []

    try {
      executor(resolve.bind(this), reject.bind(this))
    } catch (err) {
      reject(err)
    }
  }

  then (onFulfilled, onRejected) {
    if (this.status === 'fulfilled') {
      const promise2 = new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            if (typeof onFulfilled === 'function') {
              const x = onFulfilled(this.value)
              resolveExecutor(promise2, x, resolve, reject)
            } else {
              resolve(this.value)
            }
          } catch (err) {
            reject(err)
          }
        })
      })
      return promise2
    }
    if (this.status === 'rejected') {
      const promise2 = new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            if (typeof onRejected === 'function') {
              const x = onRejected(this.reason)
              resolveExecutor(promise2, x, resolve, reject)
            } else {
              reject(this.reason)
            }
          } catch (err) {
            reject(err)
          }
        })
      })
      return promise2
    }
    if (this.status === 'panding') {
      const promise2 = new Promise((resolve, reject) => {
        this.onResolveCallback.push(() => {
          setTimeout(() => {
            try {
              if (typeof onFulfilled === 'function') {
                const x = onFulfilled(this.value)
                resolveExecutor(promise2, x, resolve, reject)
              } else {
                resolve(this.value)
              }
            } catch (err) {
              reject(err)
            }
          })
        })
        this.onRejectCallback.push(() => {
          setTimeout(() => {
            try {
              if (typeof onRejected === 'function') {
                const x = onRejected(this.reason)
                resolveExecutor(promise2, x, resolve, reject)
              } else {
                reject(this.reason)
              }
            } catch (err) {
              reject(err)
            }
          })
        })
      })
      return promise2
    }
  }

  catch (onRejected) {
    return this.then(null, onRejected)
  }

  static resolve (value) {
    return new Promise(resolve => {
      resolve(value)
    })
  }

  static reject (reason) {
    return new Promise((resolve, reject) => {
      reject(reason)
    })
  }

  static all (promises) {
    return new Promise((resolve, reject) => {
      const length = promises.length
      const resolveArray = []
      while (promises.length) {
        promises.shift().then((value) => {
          resolveArray.push(value)
          if (resolveArray.length === length) {
            resolve(resolveArray)
          }
        })
      }
    })
  }

  static race (promises) {
    return new Promise((resolve, reject) => {
      while (promises.length) {
        promises.shift().then(value => value ? resolve(value) : null)
      }
    })
  }
}

const resolveExecutor = (promise2, x, resolve, reject) => {
  if (promise2 === x) {
    return reject(new TypeError('不能循环引用'))
  }
  if (x instanceof Promise) {
    x.then(resolve, reject)
  } else if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    let then
    try {
      then = x.then
    } catch (err) {
      reject(err)
    }
    if (typeof then === 'function') {
      let called = false
      const resolvePromise = (y) => {
        !called && resolveExecutor(promise2, y, resolve, reject)
        called = called === false
      }
      const rejectPromise = (r) => {
        !called && reject(r)
        called = called === false
      }
      try {
        then.call(x, resolvePromise, rejectPromise)
      } catch (err) {
        !called && reject(err)
        called = called === false
      }
    } else {
      resolve(x)
    }
  } else {
    resolve(x)
  }
}

function resolve (value) {
  const resolved = resolve.bind(this)
  const rejected = reject.bind(this)
  if (this.status === 'panding') {
    if (value instanceof Promise) {
      value.then(resolved, rejected)
    } else if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
      let then
      try {
        then = value.then
      } catch (err) {
        rejected(err)
      }
      if (typeof then === 'function') {
        let called = false
        const resolvePromise = (y) => {
          !called && resolveExecutor(null, y, resolved, rejected)
          called = called === false
        }
        const rejectPromise = (r) => {
          !called && rejected(r)
          called = called === false
        }
        try {
          then.call(value, resolvePromise, rejectPromise)
        } catch (err) {
          !called && rejected(err)
          called = called === false
        }
      } else {
        this.status = 'fulfilled'
        this.value = value
        while (this.onResolveCallback.length) {
          this.onResolveCallback.shift()()
        }
      }
    } else {
      this.status = 'fulfilled'
      this.value = value
      while (this.onResolveCallback.length) {
        this.onResolveCallback.shift()()
      }
    }
  }
}

function reject (reason) {
  if (this.status === 'panding') {
    this.status = 'rejected'
    this.reason = reason
    while (this.onRejectCallback.length) {
      this.onRejectCallback.shift()()
    }
  }
}

exports.deferred = function () {
  var resolve, reject
  var promise = new Promise(function (_resolve, _reject) {
    resolve = _resolve
    reject = _reject
  })
  return {
    promise: promise,
    resolve: resolve,
    reject: reject
  }
}
exports.resolved = Promise.resolve
exports.rejected = Promise.reject

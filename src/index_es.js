export default class Promise {
  constructor(executor) {
    this.status = 'panding'
    this.value = undefined
    this.reason = undefined

    this.onRejectCallback = []
    this.onResolveCallback = []

    this.handleResolve = (value) => {
      this.status = 'fulfilled'
      this.value = value
      while (this.onResolveCallback.length) {
        this.onResolveCallback.shift()()
      }
    }

    this.resolveExecutor = (promise2, x, resolve, reject) => {
      if (x instanceof Promise) {
        if (promise2 === x) {
          return reject(new TypeError('不能循环引用'))
        }
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
            !called && this.resolveExecutor(promise2, y, resolve, reject)
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

    this.reject = (reason) => {
      if (this.status === 'panding') {
        this.status = 'rejected'
        this.reason = reason
        while (this.onRejectCallback.length) {
          this.onRejectCallback.shift()()
        }
      }
    }

    this.resolve = (value) => {
      const resolved = this.handleResolve
      const rejected = this.reject
      if (this.status === 'panding') {
        this.resolveExecutor(null, value, resolved, rejected)
      }
    }

    try {
      executor(this.resolve, this.reject)
    } catch (err) {
      this.reject(err)
    }
  }

  then(onFulfilled, onRejected) {
    const asyncCallback = (promise2, cb, data, resolve, reject, isFulfilled) => {
      try {
        if (typeof cb === 'function') {
          const x = cb(data)
          this.resolveExecutor(promise2, x, resolve, reject)
        } else {
          isFulfilled ? resolve(data) : reject(data)
        }
      } catch (err) {
        reject(err)
      }
    }
    if (this.status === 'fulfilled') {
      const promise2 = new Promise((resolve, reject) => {
        setTimeout(() => {
          asyncCallback(promise2, onFulfilled, this.value, resolve, reject, true)
        })
      })
      return promise2
    }
    if (this.status === 'rejected') {
      const promise2 = new Promise((resolve, reject) => {
        setTimeout(() => {
          asyncCallback(promise2, onRejected, this.reason, resolve, reject)
        })
      })
      return promise2
    }
    if (this.status === 'panding') {
      const promise2 = new Promise((resolve, reject) => {
        this.onResolveCallback.push(() => {
          setTimeout(() => {
            asyncCallback(promise2, onFulfilled, this.value, resolve, reject, true)
          })
        })
        this.onRejectCallback.push(() => {
          setTimeout(() => {
            asyncCallback(promise2, onRejected, this.reason, resolve, reject)
          })
        })
      })
      return promise2
    }
  }

  catch(onRejected) {
    return this.then(null, onRejected)
  }

  static resolve(value) {
    return new Promise((resolve) => {
      resolve(value)
    })
  }

  static reject(reason) {
    return new Promise((resolve, reject) => {
      reject(reason)
    })
  }
}

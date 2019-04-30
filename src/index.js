'use strict';

function Promise(executor) {
  var self = this

  this.status = 'panding'
  this.value = undefined
  this.reason = undefined

  this.onRejectCallback = []
  this.onResolveCallback = []

  this.handleResolve = function(value) {
    self.status = 'fulfilled'
    self.value = value
    while (self.onResolveCallback.length) {
      self.onResolveCallback.shift()()
    }
  }

  this.resolveExecutor = function(promise2, x, resolve, reject) {
    if (x instanceof Promise) {
      if (promise2 === x) {
        return reject(new TypeError('不能循环引用'))
      }
      x.then(resolve, reject)
    } else if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
      var then
      try {
        then = x.then
      } catch (err) {
        reject(err)
      }
      if (typeof then === 'function') {
        var called = false
        var resolvePromise = function(y) {
          !called && self.resolveExecutor(promise2, y, resolve, reject)
          called = !called
        }
        var rejectPromise = function(r) {
          !called && reject(r)
          called = !called
        }
        try {
          then.call(x, resolvePromise, rejectPromise)
        } catch (err) {
          !called && reject(err)
          called = !called
        }
      } else {
        resolve(x)
      }
    } else {
      resolve(x)
    }
  }

  this.reject = function(reason) {
    if (self.status === 'panding') {
      self.status = 'rejected'
      self.reason = reason
      while (self.onRejectCallback.length) {
        self.onRejectCallback.shift()()
      }
    }
  }

  this.resolve = function(value) {
    var resolved = self.handleResolve
    var rejected = self.reject
    if (self.status === 'panding') {
      self.resolveExecutor(null, value, resolved, rejected)
    }
  }

  try {
    executor(this.resolve, this.reject)
  } catch (err) {
    this.reject(err)
  }
}

Promise.prototype.then = function(onFulfilled, onRejected) {
  var self = this
  var asyncCallback = function(promise2, cb, data, resolve, reject, isFulfilled) {
    try {
      if (typeof cb === 'function') {
        var x = cb(data)
        self.resolveExecutor(promise2, x, resolve, reject)
      } else {
        isFulfilled ? resolve(data) : reject(data)
      }
    } catch (err) {
      reject(err)
    }
  }
  if (this.status === 'fulfilled') {
    var promise2 = new Promise(function(resolve, reject) {
      setTimeout(function() {
        asyncCallback(promise2, onFulfilled, self.value, resolve, reject, true)
      })
    })
    return promise2
  }
  if (this.status === 'rejected') {
    var promise2 = new Promise(function(resolve, reject) {
      setTimeout(function() {
        asyncCallback(promise2, onRejected, self.reason, resolve, reject)
      })
    })
    return promise2
  }
  if (this.status === 'panding') {
    var promise2 = new Promise(function(resolve, reject) {
      self.onResolveCallback.push(function() {
        setTimeout(function() {
          asyncCallback(promise2, onFulfilled, self.value, resolve, reject, true)
        })
      })
      self.onRejectCallback.push(function() {
        setTimeout(function() {
          asyncCallback(promise2, onRejected, self.reason, resolve, reject)
        })
      })
    })
    return promise2
  }
}

Promise.prototype.catch = function(onRejected) {
  return this.then(null, onRejected)
}

Promise.resolve = function(value) {
  return new Promise(function(resolve) {
    resolve(value)
  })
}

Promise.reject = function(reason) {
  return new Promise(function(resolve, reject) {
    reject(reason)
  })
}

module.exports = Promise;

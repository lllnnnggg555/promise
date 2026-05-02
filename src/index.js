'use strict';

var PENDING = 'pending';
var FULFILLED = 'fulfilled';
var REJECTED = 'rejected';

var asyncRun = function asyncRun(callback) {
  setTimeout(callback, 0);
};

var isThenable = function isThenable(value) {
  return value !== null && (typeof value === 'object' || typeof value === 'function');
};

var resolvePromise = function resolvePromise(promise, x, resolve, reject) {
  if (promise === x) {
    return reject(new TypeError('A promise cannot resolve itself.'));
  }

  if (x instanceof Promise) {
    return x.then(resolve, reject);
  }

  if (!isThenable(x)) {
    return resolve(x);
  }

  var called = false;

  try {
    var then = x.then;

    if (typeof then !== 'function') {
      return resolve(x);
    }

    then.call(x, function (y) {
      if (called) return;
      called = true;
      resolvePromise(promise, y, resolve, reject);
    }, function (r) {
      if (called) return;
      called = true;
      reject(r);
    });
  } catch (err) {
    if (called) return;
    called = true;
    reject(err);
  }
};

function Promise(executor) {
  var _this = this;

  if (typeof executor !== 'function') {
    throw new TypeError('Promise resolver ' + executor + ' is not a function');
  }

  this.status = PENDING;
  this.value = undefined;
  this.reason = undefined;
  this.onFulfilledCallbacks = [];
  this.onRejectedCallbacks = [];

  var fulfill = function fulfill(value) {
    settle(FULFILLED, value);
  };

  var reject = function reject(reason) {
    settle(REJECTED, reason);
  };

  var resolve = function resolve(value) {
    resolvePromise(_this, value, fulfill, reject);
  };

  var settle = function settle(status, data) {
    if (_this.status !== PENDING) return;

    _this.status = status;

    var callbacks = status === FULFILLED ? _this.onFulfilledCallbacks : _this.onRejectedCallbacks;

    if (status === FULFILLED) {
      _this.value = data;
    } else {
      _this.reason = data;
    }

    callbacks.forEach(function (callback) {
      return callback();
    });
  };

  try {
    executor(resolve, reject);
  } catch (err) {
    reject(err);
  }
}

Promise.prototype.then = function (onFulfilled, onRejected) {
  var _this2 = this;

  var promise2 = new Promise(function (resolve, reject) {
    var runFulfilled = function runFulfilled() {
      asyncRun(function () {
        try {
          if (typeof onFulfilled !== 'function') {
            return resolve(_this2.value);
          }

          resolvePromise(promise2, onFulfilled(_this2.value), resolve, reject);
        } catch (err) {
          reject(err);
        }
      });
    };

    var runRejected = function runRejected() {
      asyncRun(function () {
        try {
          if (typeof onRejected !== 'function') {
            return reject(_this2.reason);
          }

          resolvePromise(promise2, onRejected(_this2.reason), resolve, reject);
        } catch (err) {
          reject(err);
        }
      });
    };

    if (_this2.status === FULFILLED) {
      runFulfilled();
    } else if (_this2.status === REJECTED) {
      runRejected();
    } else {
      _this2.onFulfilledCallbacks.push(runFulfilled);
      _this2.onRejectedCallbacks.push(runRejected);
    }
  });

  return promise2;
};

Promise.prototype.catch = function (onRejected) {
  return this.then(null, onRejected);
};

Promise.resolve = function (value) {
  return new Promise(function (resolve) {
    return resolve(value);
  });
};

Promise.reject = function (reason) {
  return new Promise(function (resolve, reject) {
    return reject(reason);
  });
};

module.exports = Promise;

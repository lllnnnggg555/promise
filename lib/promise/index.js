'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Promise = function () {
  function Promise(executor) {
    _classCallCheck(this, Promise);

    this.status = 'panding';
    this.value = undefined;
    this.reason = undefined;

    this.onResolveCallback = [];
    this.onRejectCallback = [];

    try {
      executor(resolve.bind(this), reject.bind(this));
    } catch (err) {
      reject(err);
    }
  }

  _createClass(Promise, [{
    key: 'then',
    value: function then(onFulfilled, onRejected) {
      var _this = this;

      if (this.status === 'fulfilled') {
        var promise2 = new Promise(function (resolve, reject) {
          setTimeout(function () {
            try {
              if (typeof onFulfilled === 'function') {
                var x = onFulfilled(_this.value);
                resolveExecutor(promise2, x, resolve, reject);
              } else {
                resolve(_this.value);
              }
            } catch (err) {
              reject(err);
            }
          });
        });
        return promise2;
      }
      if (this.status === 'rejected') {
        var _promise = new Promise(function (resolve, reject) {
          setTimeout(function () {
            try {
              if (typeof onRejected === 'function') {
                var x = onRejected(_this.reason);
                resolveExecutor(_promise, x, resolve, reject);
              } else {
                reject(_this.reason);
              }
            } catch (err) {
              reject(err);
            }
          });
        });
        return _promise;
      }
      if (this.status === 'panding') {
        var _promise2 = new Promise(function (resolve, reject) {
          _this.onResolveCallback.push(function () {
            setTimeout(function () {
              try {
                if (typeof onFulfilled === 'function') {
                  var x = onFulfilled(_this.value);
                  resolveExecutor(_promise2, x, resolve, reject);
                } else {
                  resolve(_this.value);
                }
              } catch (err) {
                reject(err);
              }
            });
          });
          _this.onRejectCallback.push(function () {
            setTimeout(function () {
              try {
                if (typeof onRejected === 'function') {
                  var x = onRejected(_this.reason);
                  resolveExecutor(_promise2, x, resolve, reject);
                } else {
                  reject(_this.reason);
                }
              } catch (err) {
                reject(err);
              }
            });
          });
        });
        return _promise2;
      }
    }
  }, {
    key: 'catch',
    value: function _catch(onRejected) {
      return this.then(null, onRejected);
    }
  }], [{
    key: 'resolve',
    value: function resolve(value) {
      return new Promise(function (resolve) {
        resolve(value);
      });
    }
  }, {
    key: 'reject',
    value: function reject(reason) {
      return new Promise(function (resolve, reject) {
        reject(reason);
      });
    }
  }, {
    key: 'all',
    value: function all(promises) {
      return new Promise(function (resolve, reject) {
        var length = promises.length;
        var resolveArray = [];
        while (promises.length) {
          promises.shift().then(function (value) {
            resolveArray.push(value);
            if (resolveArray.length === length) {
              resolve(resolveArray);
            }
          });
        }
      });
    }
  }, {
    key: 'race',
    value: function race(promises) {
      return new Promise(function (resolve, reject) {
        while (promises.length) {
          promises.shift().then(function (value) {
            return value ? resolve(value) : null;
          });
        }
      });
    }
  }]);

  return Promise;
}();

var resolveExecutor = function resolveExecutor(promise2, x, resolve, reject) {
  if (promise2 === x) {
    return reject(new TypeError('不能循环引用'));
  }
  if (x instanceof Promise) {
    x.then(resolve, reject);
  } else if (x !== null && ((typeof x === 'undefined' ? 'undefined' : _typeof(x)) === 'object' || typeof x === 'function')) {
    var then = void 0;
    try {
      then = x.then;
    } catch (err) {
      reject(err);
    }
    if (typeof then === 'function') {
      var called = false;
      var resolvePromise = function resolvePromise(y) {
        !called && resolveExecutor(promise2, y, resolve, reject);
        called = called === false;
      };
      var rejectPromise = function rejectPromise(r) {
        !called && reject(r);
        called = called === false;
      };
      try {
        then.call(x, resolvePromise, rejectPromise);
      } catch (err) {
        !called && reject(err);
        called = called === false;
      }
    } else {
      resolve(x);
    }
  } else {
    resolve(x);
  }
};

function resolve(value) {
  var resolved = resolve.bind(this);
  var rejected = reject.bind(this);
  if (this.status === 'panding') {
    if (value instanceof Promise) {
      value.then(resolved, rejected);
    } else if (value !== null && ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' || typeof value === 'function')) {
      var then = void 0;
      try {
        then = value.then;
      } catch (err) {
        rejected(err);
      }
      if (typeof then === 'function') {
        var called = false;
        var resolvePromise = function resolvePromise(y) {
          !called && resolveExecutor(null, y, resolved, rejected);
          called = called === false;
        };
        var rejectPromise = function rejectPromise(r) {
          !called && rejected(r);
          called = called === false;
        };
        try {
          then.call(value, resolvePromise, rejectPromise);
        } catch (err) {
          !called && rejected(err);
          called = called === false;
        }
      } else {
        this.status = 'fulfilled';
        this.value = value;
        while (this.onResolveCallback.length) {
          this.onResolveCallback.shift()();
        }
      }
    } else {
      this.status = 'fulfilled';
      this.value = value;
      while (this.onResolveCallback.length) {
        this.onResolveCallback.shift()();
      }
    }
  }
}

function reject(reason) {
  if (this.status === 'panding') {
    this.status = 'rejected';
    this.reason = reason;
    while (this.onRejectCallback.length) {
      this.onRejectCallback.shift()();
    }
  }
}

exports.deferred = function () {
  var resolve, reject;
  var promise = new Promise(function (_resolve, _reject) {
    resolve = _resolve;
    reject = _reject;
  });
  return {
    promise: promise,
    resolve: resolve,
    reject: reject
  };
};
exports.resolved = Promise.resolve;
exports.rejected = Promise.reject;

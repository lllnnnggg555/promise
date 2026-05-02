'use strict';

var PENDING = 'pending';
var FULFILLED = 'fulfilled';
var REJECTED = 'rejected';

var asyncRun = (function () {
  if (typeof queueMicrotask === 'function') {
    return queueMicrotask;
  }

  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
    var queue = [];
    var toggle = 0;
    var node = document.createTextNode('');

    new MutationObserver(function () {
      var callbacks = queue.slice();
      queue.length = 0;

      for (var i = 0; i < callbacks.length; i++) {
        callbacks[i]();
      }
    }).observe(node, { characterData: true });

    return function (callback) {
      queue.push(callback);
      toggle = (toggle + 1) % 2;
      node.data = String(toggle);
    };
  }

  return function (callback) {
    setTimeout(callback, 0);
  };
}());

function isObjectOrFunction(value) {
  return value !== null && (typeof value === 'object' || typeof value === 'function');
}

function resolvePromise(promise, x, resolve, reject) {
  if (promise === x) {
    return reject(new TypeError('A promise cannot resolve itself.'));
  }

  if (x instanceof Promise) {
    return x.then(resolve, reject);
  }

  if (!isObjectOrFunction(x)) {
    return resolve(x);
  }

  var called = false;
  var then;

  try {
    then = x.then;
  } catch (err) {
    return reject(err);
  }

  if (typeof then !== 'function') {
    return resolve(x);
  }

  try {
    then.call(
      x,
      function (y) {
        if (called) {
          return;
        }
        called = true;
        resolvePromise(promise, y, resolve, reject);
      },
      function (r) {
        if (called) {
          return;
        }
        called = true;
        reject(r);
      }
    );
  } catch (err) {
    if (called) {
      return;
    }
    called = true;
    reject(err);
  }
}

function Promise(executor) {
  if (typeof executor !== 'function') {
    throw new TypeError('Promise resolver ' + executor + ' is not a function');
  }

  var self = this;

  self.status = PENDING;
  self.value = undefined;
  self.reason = undefined;
  self.callbacks = [];

  function fulfill(value) {
    if (self.status !== PENDING) {
      return;
    }

    self.status = FULFILLED;
    self.value = value;
    flush(self);
  }

  function reject(reason) {
    if (self.status !== PENDING) {
      return;
    }

    self.status = REJECTED;
    self.reason = reason;
    flush(self);
  }

  function resolve(value) {
    if (self.status !== PENDING) {
      return;
    }

    resolvePromise(self, value, fulfill, reject);
  }

  self.resolve = resolve;
  self.reject = reject;

  try {
    executor(resolve, reject);
  } catch (err) {
    reject(err);
  }
}

function flush(promise) {
  var callbacks = promise.callbacks;
  promise.callbacks = [];

  for (var i = 0; i < callbacks.length; i++) {
    handle(promise, callbacks[i]);
  }
}

function handle(promise, callback) {
  if (promise.status === PENDING) {
    promise.callbacks.push(callback);
    return;
  }

  asyncRun(function () {
    var isFulfilled = promise.status === FULFILLED;
    var cb = isFulfilled ? callback.onFulfilled : callback.onRejected;
    var data = isFulfilled ? promise.value : promise.reason;

    if (typeof cb !== 'function') {
      if (isFulfilled) {
        callback.resolve(data);
      } else {
        callback.reject(data);
      }
      return;
    }

    try {
      var x = cb(data);
      resolvePromise(callback.promise, x, callback.resolve, callback.reject);
    } catch (err) {
      callback.reject(err);
    }
  });
}

Promise.prototype.then = function (onFulfilled, onRejected) {
  var self = this;
  var handler;
  var promise2 = new Promise(function (resolve, reject) {
    handler = {
      promise: null,
      onFulfilled: onFulfilled,
      onRejected: onRejected,
      resolve: resolve,
      reject: reject
    };
  });

  handler.promise = promise2;
  handle(self, handler);

  return promise2;
};

Promise.prototype.catch = function (onRejected) {
  return this.then(null, onRejected);
};

Promise.prototype.finally = function (callback) {
  var PromiseConstructor = this.constructor || Promise;

  return this.then(
    function (value) {
      return PromiseConstructor.resolve(typeof callback === 'function' ? callback() : callback).then(function () {
        return value;
      });
    },
    function (reason) {
      return PromiseConstructor.resolve(typeof callback === 'function' ? callback() : callback).then(function () {
        throw reason;
      });
    }
  );
};

Promise.resolve = function (value) {
  if (value instanceof Promise) {
    return value;
  }

  return new Promise(function (resolve) {
    resolve(value);
  });
};

Promise.reject = function (reason) {
  return new Promise(function (resolve, reject) {
    reject(reason);
  });
};

Promise.all = function (promises) {
  return new Promise(function (resolve, reject) {
    if (!promises || typeof promises.length !== 'number') {
      return reject(new TypeError('Promise.all accepts an array-like object.'));
    }

    var length = promises.length;
    var results = new Array(length);
    var remaining = length;

    if (length === 0) {
      return resolve(results);
    }

    function resolver(index) {
      return function (value) {
        results[index] = value;
        remaining -= 1;

        if (remaining === 0) {
          resolve(results);
        }
      };
    }

    for (var i = 0; i < length; i++) {
      Promise.resolve(promises[i]).then(resolver(i), reject);
    }
  });
};

Promise.race = function (promises) {
  return new Promise(function (resolve, reject) {
    if (!promises || typeof promises.length !== 'number') {
      return reject(new TypeError('Promise.race accepts an array-like object.'));
    }

    for (var i = 0; i < promises.length; i++) {
      Promise.resolve(promises[i]).then(resolve, reject);
    }
  });
};

module.exports = Promise;

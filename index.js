
var PENDING = 'PENDING'
var FULFILLED = 'FULFILLED'
var REJECTED = 'REJECTED'

function QueueItem (promise, onSuccess, onError) {
  if (!(this instanceof QueueItem)) {
    return new QueueItem(promise, onSuccess, onError)
  }

  this.$promise = promise
  this.$onSuccess = onSuccess && typeof onSuccess === 'function' ? onSuccess : function (item) { return item }
  this.$onError = onError && typeof onError === 'function' ? onError : function (item) { throw item }
}

QueueItem.prototype.FULFILLED = function(value) {
  execCallback.call(this.$promise, this.$onSuccess, value)
}

QueueItem.prototype.REJECTED = function(value) {
  execCallback.call(this.$promise, this.$onError, value)
}

function Promise(resolver) {
  if (!(this instanceof Promise)) {
    return new Promise(resolver)
  }

  this.$status = PENDING
  this.$value = undefined
  this.$queue = []

  if (resolver) {
    execResolver.call(this, resolver)
  }
}
module.exports = Promise

function execResolver(resolver) {
  var self = this
    , isCalled = false

  function onSuccess(value) {
    if (isCalled)
      return
    isCalled = true

    execQueue.call(self, FULFILLED, value)
  }

  function onError(reason) {
    if (isCalled)
      return
    isCalled = true

    execQueue.call(self, REJECTED, reason)
  }

  try {
    resolver(onSuccess, onError)
  } catch (e) {
    onError(e)
  }
}

function getThenMethod(value) {
  var then = value && value.then
  if (value && typeof value === 'object' && typeof then === 'function') {
    return function (resolve, reject) {
      then.call(value, resolve, reject)
    }
  } else {
    return null
  }
}

function execQueue(type, value) {
  if (type === FULFILLED && (typeof value === 'object' || typeof value === 'function')) {
    var then = null

    try {
      then = getThenMethod(value)
    } catch (e) {
      execQueue.call(this, REJECTED, e)

      return
    }

    if (then) {
      execResolver.call(this, then)

      return
    }
  }

  this.$status = type
  this.$value = value

  for (var index = 0; index < this.$queue.length; index++) {
    var item = this.$queue[index];
    if (item) {
      item[type](value)
    }
  }
}

function execCallback(func, value) {
  var self = this

  setTimeout(function() {
    var result = null
    try {
      result = func(value)
    } catch (e) {
      execQueue.call(self, REJECTED, e)

      return
    }

    if (result === self) {
      execQueue.call(self, REJECTED, new TypeError('Can not return itself.'))
    } else {
      execQueue.call(self, FULFILLED, result)
    }
  }, 4)
}

Promise.prototype.then = function (onSuccess, onError) {
  if (typeof onSuccess !== 'function' && this.$status === FULFILLED ||
      typeof onError !== 'function' && this.$status === REJECTED) {
    return this
  }

  var promise = new Promise()

  if (this.$status === PENDING) {
    this.$queue.push(new QueueItem(promise, onSuccess, onError))
  } else if (this.$status === FULFILLED) {
    execCallback.call(promise, onSuccess, this.$value)
  } else {
    execCallback.call(promise, onError, this.$value)
  }

  return promise
}

Promise.prototype.catch = function (onError) {
  return this.then(null, onError)
}

Promise.deferred = Promise.defer = function () {
  var result = {}
  result.promise = new Promise(function (resolve, reject) {
    result.resolve = resolve
    result.reject = reject
  })
  return result
}

Promise.resolve = function (value) {
  if (value instanceof Promise)
    return value

  return new Promise(resolve => resolve(value))
}

Promise.reject = function (value) {
  if (value instanceof Promise)
    return value

  return new Promise((resolve, reject) => reject(value))
}

Promise.stop = function () {
  return new Promise()
}

Promise.sequence = function (funcs) {
  var promise = Promise.resolve()

  for (var index = 0; index < funcs.length; index++) {
    var item = funcs[index]
    promise = promise.then(item)
  }

  return promise
}

function filter(data, callback) {
  var result = []
  for (var index = 0; index < data.length; index++) {
    var item = data[index]
    if (callback(item, index)) {
      result.push(item)
    }
  }
  return result
}

Promise.all = function (promises) {
  return new Promise(function (resolve, reject) {
    var result = new Array(promises.length)
      , isCalled = false

    for (var index = 0; index < promises.length; index++) {
      var item = promises[index]
        (function (promise, i) {
          promise.then(
            function (value) {
              if (isCalled)
                return

              result[i] = {
                value: value,
                success: true
              }

              var isCompleted = true
              for (var ii = 0; ii < result.length; ii++) {
                var item = result[ii]
                if (!item || !item.success) {
                  isCompleted = false
                  return
                }
              }

              isCalled = true

              var convertedResult = []
              for (var ii = 0; ii < result.length; ii++) {
                var item = result[ii]
                convertedResult.push(item.value)
              }
              resolve(convertedResult)
            },
            function (reason) {
              if (isCalled)
                return

              isCalled = true
              reject(reason)
            }
          )
        })(item, index)
    }
  })
}

Promise.race = function (promises) {
  return new Promise(function (resolve, reject) {
    var isCalled = false

    for (var index = 0; index < promises.length; index++) {
      var item = promises[index]
        (function (promise, i) {
          promise.then(
            function (value) {
              if (isCalled)
                return

              isCalled = true
              resolve(value)
            },
            function (reason) {
              if (isCalled)
                return

              isCalled = true
              reject(reason)
            }
          )
        })(item, index)
    }
  })
}

Promise.timeout = function (promise, tick) {
  return Promise.race([
    promise,
    Promise.reject().wait(tick)
  ])
}

Promise.prototype.wait = function (tick) {
  return this.then(
    function (value) {
      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          resolve(value)
        }, tick)
      })
    },
    function (reason) {
      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          reject(reason)
        }, tick)
      })
    }
  )
}

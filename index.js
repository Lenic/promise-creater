
const PENDING = 'PENDING'
const FULFILLED = 'FULFILLED'
const REJECTED = 'REJECTED'
const EMPTY_FUNCTION = function () { }

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

    self.$status = FULFILLED
    self.$value = value

    execQueue.call(self)
  }

  function onError(reason) {
    if (isCalled)
      return
    isCalled = true

    self.$status = REJECTED
    self.$value = reason

    execQueue.call(self)
  }

  try {
    resolver(onSuccess, onError)
  } catch (e) {
    onError(e)
  }
}

function execQueue() {
  for (var i = 0; i < this.$queue.length; i++) {
    var item = this.$queue[i]
    if (item) {
      item.exec(this.$status, this.$value)
    }
  }
}

function QueueItem(promise, onSuccess, onError) {
  if (!(this instanceof QueueItem)) {
    return new QueueItem(promise, onSuccess, onError)
  }

  this.$promise = promise
  this.$onSuccess = onSuccess || EMPTY_FUNCTION
  this.$onError = onError || EMPTY_FUNCTION
}

QueueItem.prototype.exec = function (status, value) {
  if (value && value.then && typeof value.then === 'function') {
    execResolver.call(this.$promise, value.then)
    return
  }

  this.$promise.$status = status
  this.$promise.$value = value

  if (this.$promise.$status === FULFILLED) {
    try {
      this.$promise.$value = this.$onSuccess.call(null, this.$promise.$value)
    } catch (e) {
      this.$onError.call(null, e)
    }

  } else if (this.$promise.$status === REJECTED) {
    this.$onError.call(null, this.$promise.$value)
  }

  execQueue.call(this.$promise)
}

Promise.prototype.then = function (onSuccess, onError) {
  if (typeof onSuccess !== 'function' && this.$status === FULFILLED ||
    typeof onError !== 'function' && this.$status === REJECTED) {
    return this
  }

  var self = this
    , promise = new Promise()

  this.$queue.push(new QueueItem(promise, onSuccess, onError))

  if (this.$status !== PENDING) {
    execQueue.call(this)

    execResolver.call(promise, function (resolve, reject) {
      if (self.$status === FULFILLED) {
        resolve(self.$value)
      } else {
        reject(self.$value)
      }
    })
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

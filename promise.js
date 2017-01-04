var Promise = require('./core')

Promise.prototype.catch = function (onError) {
  return this.then(null, onError)
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

module.exports = Promise

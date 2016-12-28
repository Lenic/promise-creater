
const PENDING = 'PENDING'
const FULFILLED = 'FULFILLED'
const REJECTED = 'REJECTED'

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
  this.$onSuccess = onSuccess
  this.$onError = onError
}

QueueItem.prototype.exec = function (status, value) {
  this.$promise.$status = status
  this.$promise.$value = value

  if (this.$promise.$status === FULFILLED) {
    try {
      this.$onSuccess.call(null, this.$promise.$value)
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


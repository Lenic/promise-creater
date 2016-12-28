
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

  resolver(onSuccess, onError)
}

function execQueue() {
  for (var i = this.$queue.length - 1; i >= 0; i--) {
    var item = this.$queue[i]
    if (item) {
      item.exec()
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

QueueItem.prototype.exec = function () {
  if (this.$promise.status === PENDING) {
    throw new Error('Called opportunity error: promise\'s status is pending.')
  }

  if (this.$promise.status === FULFILLED) {
    try {
      this.$onSuccess.call(null, this.$promise.$value)
    } catch (e) {
      this.$onError.call(null, e)
    }

  } else if (this.$promise.status === REJECTED) {
    this.$onError.call(null, this.$promise.$value)
  }
}


const PENDING = 'PENDING'
const FULFILLED = 'FULFILLED'
const REJECTED = 'REJECTED'
const DEFAULT_SUCCESS = v => v
const DEFAULT_ERROR = e => { throw e }

class ParameterResolver {
  constructor(resolver, callback) {
    this.$resolver = resolver
    this.$callback = callback

    this.$isCalled = false
  }

  callbackHandler(type, value) {
    if (this.$isCalled) {
      return
    }
    this.$isCalled = true

    this.$callback(type, value)
  }

  exec() {
    try {
      this.$resolver(
        value => this.callbackHandler(FULFILLED, value),
        e => this.callbackHandler(REJECTED, e)
      )
    } catch (e) {
      this.callbackHandler(REJECTED, e)
    }
  }

  static exec(resolver, callback) {
    new ParameterResolver(resolver, callback).exec()

    return
  }
}

class Promise {
  constructor(resolver) {
    this.$status = PENDING
    this.$value = undefined

    this[`$${FULFILLED}`] = []
    this[`$${REJECTED}`] = []

    this.callQueue = this.callQueue.bind(this)

    if (resolver) {
      ParameterResolver.exec(resolver, this.callQueue)
    }
  }

  callQueue(queueName, value) {
    let then = null
    try {
      then = value && value.then
    } catch (e) {
      this.callQueue(REJECTED, e)
    }

    if (queueName === FULFILLED && (typeof value === 'object' || typeof value === 'function')) {
      if (typeof value === 'object' && typeof then === 'function') {
        return ParameterResolver.exec(
          (resolve, reject) => then.call(value, resolve, reject),
          this.callQueue
        )
      }
    }

    this.$status = queueName
    this.$value = value

    this[`$${queueName}`].forEach(cb => cb(value))
  }

  then(resolve, reject) {
    if (typeof resolve !== 'function') {
      resolve = DEFAULT_SUCCESS
    }

    if (typeof reject !== 'function') {
      reject = DEFAULT_ERROR
    }

    let promise = new this.constructor()

    if (this.$status === PENDING) {
      this[`$${FULFILLED}`].push(v => promise.exec(() => resolve(v)))
      this[`$${REJECTED}`].push(e => promise.exec(() => reject(e)))
    } else if (this.$status === FULFILLED) {
      promise.exec(() => resolve(this.$value))
    } else {
      promise.exec(() => reject(this.$value))
    }

    return promise
  }

  exec(callback) {
    setTimeout(() => {
      let result = null
      try {
        result = callback()
      } catch (e) {
        this.callQueue(REJECTED, e)

        return
      }

      if (result === this) {
        this.callQueue(REJECTED, new TypeError('Can not use itself.'))
      } else {
        this.callQueue(FULFILLED, result)
      }
    }, 0)
  }
}

module.exports = Promise

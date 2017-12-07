var plasmaWithFeedbackVersion = require('./package.json').version
var deepEqual = require('organic-plasma/lib/utils').deepEqual

module.exports = function (originalPlasma) {
  if (originalPlasma.$plasmaWithFeedbackVersion) {
    if (originalPlasma.$plasmaWithFeedbackVersion !== plasmaWithFeedbackVersion) {
      console.warn('given plasma already has feedback but with different version',
        originalPlasma.$plasmaWithFeedbackVersion, '<!-->', plasmaWithFeedbackVersion)
    }
    return originalPlasma
  }
  var plasmaWithFeedback = {
    $plasmaWithFeedbackVersion: plasmaWithFeedbackVersion
  }
  for (var key in originalPlasma) {
    plasmaWithFeedback[key] = originalPlasma[key]
  }

  plasmaWithFeedback.on = function (pattern, handler, context, once) {
    if (Array.isArray(pattern)) {
      return originalPlasma.on(pattern, handler, context, once)
    }
    if (typeof pattern === 'string') {
      pattern = {type: pattern}
    }

    var reactionFn = handler
    if (handler.length === 2) { // has callback
      reactionFn = function (c, next) {
        var chemicalType = c.type
        return handler.call(context, c, function (err, result) {
          var resultChemical = {
            type: chemicalType + '-result',
            $feedback_timestamp: c.$feedback_timestamp,
            err: err,
            result: result
          }
          originalPlasma.emit(resultChemical)
          next && next(resultChemical)
        })
      }
    }

    originalPlasma.on(pattern, reactionFn, context, once)
  }

  plasmaWithFeedback.emit = function (input, callback) {
    var chemical
    if (typeof input === 'string') {
      chemical = {type: input}
    } else {
      chemical = {}
      for (var key in input) {
        chemical[key] = input[key]
      }
    }

    if (callback) {
      if (!chemical.$feedback_timestamp) {
        chemical.$feedback_timestamp = (new Date()).getTime() + Math.random()
        originalPlasma.once({
          type: chemical.type + '-result',
          $feedback_timestamp: chemical.$feedback_timestamp
        }, function (c) {
          callback(c.err, c.result)
        })
      } else {
        originalPlasma.on({
          type: chemical.type + '-result',
          $feedback_timestamp: chemical.$feedback_timestamp
        }, function (c) {
          callback(c.err, c.result)
        })
      }
      originalPlasma.emit(chemical)
    } else {
      originalPlasma.emit(chemical)
    }
  }

  plasmaWithFeedback.emitAndWaitAll = function (input, callback) {
    var chemical
    if (typeof input === 'string') {
      chemical = {type: input}
    } else {
      chemical = {}
      for (var key in input) {
        chemical[key] = input[key]
      }
    }

    this.notifySubscribers(chemical)

    var errors = []
    var results = []
    var listenersToCall = []
    var waitForListenersCount = 0

    var waitForListenersHandler = function (c) {
      if (c.err) errors.push(c.err)
      results.push(c.result)
      waitForListenersCount--
      if (waitForListenersCount <= 0) {
        callback(errors.length ? errors : null, results)
      }
    }

    if (!chemical.$feedback_timestamp) {
      chemical.$feedback_timestamp = (new Date()).getTime() + Math.random()
    }

    for (var i = 0, len = this.listeners.length; i < len && i < this.listeners.length; i++) {
      var listener = this.listeners[i]
      if (deepEqual(listener.pattern, chemical)) {
        listenersToCall.push(listener)
        if (listener.handler.length === 2) {
          waitForListenersCount++
        }
        if (listener.once) {
          this.listeners.splice(i, 1)
          i -= 1
          len -= 1
        }
      }
    }

    for (i = 0, len = listenersToCall.length; i < len; i++) {
      var listenerToCall = listenersToCall[i]
      var aggregated
      if (listenerToCall.handler.length === 2) {
        aggregated = listenerToCall.handler.call(listenerToCall.context, chemical, waitForListenersHandler)
      } else {
        aggregated = listenerToCall.handler.call(listenerToCall.context, chemical)
      }
      if (aggregated === true) return
    }
  }

  return plasmaWithFeedback
}

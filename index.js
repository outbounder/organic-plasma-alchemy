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
          originalPlasma.emit({
            type: chemicalType + '-result',
            $feedback_timestamp: c.$feedback_timestamp,
            err: err,
            result: result
          }, next)
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
      var waitForListenersCount = 0
      for (var i = 0, len = this.listeners.length; i < len; i++) {
        var listener = this.listeners[i]
        if (listener.handler && listener.handler.length === 2) {
          if (deepEqual(listener.pattern, chemical)) {
            waitForListenersCount++
          }
        }
      }

      if (!chemical.$feedback_timestamp) {
        chemical.$feedback_timestamp = (new Date()).getTime() + Math.random()
      }

      var resultChemical = {
        type: chemical.type + '-result',
        $feedback_timestamp: chemical.$feedback_timestamp
      }

      var waitForListenersHandler = function (c) {
        waitForListenersCount--
        if (waitForListenersCount <= 0) {
          originalPlasma.off(resultChemical, waitForListenersHandler)
          callback(c.err, c.result)
        }
      }

      originalPlasma.on(resultChemical, waitForListenersHandler)
      originalPlasma.emit(chemical)
    } else {
      originalPlasma.emit(chemical)
    }
  }

  return plasmaWithFeedback
}

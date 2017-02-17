var Plasma = require('organic-plasma')

describe('feedback aggregation', function () {
  var instance = require('../index')(new Plasma())
  var handled = 0
  var emitCallbackCalled = false

  it('multiple listeners returning true are not hit simultaniously', function (done) {
    instance.on('simultanious', function (c, next) {
      handled += 1
      next(null, 1)
      return true
    })
    instance.on('simultanious', function (c, next) {
      handled += 1
      next(null, 2)
      return true
    })

    instance.emit('simultanious', function (err, result) {
      if (err) return done(err)
      emitCallbackCalled = true
    })

    done()
  })

  it('emit callback should not be called', function (done) {
    setTimeout(function () {
      expect(emitCallbackCalled).toBe(false)
      expect(handled).toBe(1)
      done()
    }, 100)
  })
})

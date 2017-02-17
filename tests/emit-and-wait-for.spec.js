var Plasma = require('organic-plasma')

describe('emit and wait for async listeners (handler.length > 0) to call back', function () {
  var instance = require('../index')(new Plasma())
  var handled = 0
  var emitCallbackCalled = false

  it('define two listeners', function (done) {
    instance.on('kill', function (c, next) {
      handled += 1
      next(null, 1)
    })
    instance.on('kill', function (c, next) {
      handled += 1
      next(null, 2)
    })
    done()
  })

  it('emit', function (done) {
    instance.emit('kill', function (err, result) {
      if (err) return done(err)
      expect(result).toBe(2)
      expect(handled).toBe(2)
      done()
    })
  })

  it('define two more listeners, first without callback', function (done) {
    handled = 0

    instance.on('another', function () {
      handled += 1
    })
    instance.on('another', function (c, next) {
      handled += 1
      next(null, 2)
    })
    done()
  })

  it('emit', function (done) {
    instance.emit('another', function (err, result) {
      if (err) return done(err)
      expect(result).toBe(2)
      expect(handled).toBe(2)
      done()
    })
  })

  it('define two more listeners, first with callback, but doesnt call next!', function (done) {
    handled = 0

    instance.on('again', function (c, next) {
      handled += 1
    })
    instance.on('again', function (c, next) {
      handled += 1
      next(null, 2)
    })
    done()
  })

  it('emit', function (done) {
    instance.emit('again', function (err, result) {
      if (err) return done(err)
      emitCallbackCalled = true
    })
    done()
  })

  it('emit callback should not be called', function (done) {
    setTimeout(function () {
      expect(emitCallbackCalled).toBe(false)
      expect(handled).toBe(2)
      done()
    }, 100)
  })
})

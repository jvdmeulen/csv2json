'use strict'

// ===================================================================

var parseCsv = require('csv-parser')
var pumpify = require('pumpify')
var through2 = require('through2')
var stripBomStream = require('strip-bom-stream')

// ===================================================================

function noop () {}

var hasOwn = Object.prototype.hasOwnProperty
function parseDynamic (data) {
  var name, value
  for (name in data) {
    if (hasOwn.call(data, name)) {
      value = data[name].toLowerCase()
      if (value === 'true') {
        data[name] = true
      } else if (value === 'false') {
        data[name] = false
      } else if (value !== '') {
        value = +value
        if (!isNaN(value)) {
          data[name] = value
        }
      }
    }
  }
}

function csv2json (opts) {
  opts || (opts = {})

  var process = opts.dynamicTyping
    ? parseDynamic
    : noop

  return pumpify([
    stripBomStream(),
    parseCsv({
      raw: opts.raw || false,     // do not decode to utf-8 strings
      separator: opts.separator, // specify optional cell separator
      quote: opts.quote || '"',     // specify optional quote character
      escape: opts.escape || '"',    // specify optional escape character (defaults to quote value)
      newline: opts.newline || '\n',  // specify a newline character
      strict: opts.strict || true,    // require column length match headers length
      headers: opts.headers || null
    }),
    (function () {
      var notFirst = false
      var proxy = through2.obj(function (chunk, _, done) {
        if (notFirst) {
          this.push(',\n')
        }
        notFirst = true

        process(chunk)

        done(null, JSON.stringify(chunk))
      }, function (done) {
        this.push('\n]\n')
        done()
      })
      proxy.push('[\n')

      return proxy
    })()
  ])
}
exports = module.exports = csv2json

const fs = require('fs')
const split = require('split2')
const ora = require('ora')
const histogram = require('ascii-histogram')
const through2 = require('through2')
const throttle = require('lodash.throttle')
const hydrate = require('./hydrate')

const spinner = ora('In progress...').start()

const source = fs.createReadStream('../data/data.csv')

const lineToObject = () => through2.obj(
  (line, enc, cb) => {
    const row = line.toString().split(',')
    const collision = hydrate(row)
    cb(null, collision)
  }
)

const weekdays = [ 0, 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun' ]

const renderText = (data) => `Collisions by weekday:\n` + histogram(data, {
  bar: '=', width: 20 })

const showProgress = throttle(renderText, 500)

const collisionsByWeekday = () => through2.obj(
  function (collision, enc, cb) {
    const wd = collision.collisionDay
    const wdName = weekdays[wd]
    if (!wdName) { return cb() }
    if (!this.byDay) { this.byDay = {} }
    const collisionsOnAWeekday = this.byDay[wdName] || 0
    this.byDay[wdName] = collisionsOnAWeekday + 1
    spinner.text = showProgress(this.byDay)
    return cb()
  }, function (cb) {
    this.push(this.byDay)
    return cb()
  }
)

source
  .pipe(split())
  .pipe(lineToObject())
  .pipe(collisionsByWeekday())
  .pipe(process.stdout)

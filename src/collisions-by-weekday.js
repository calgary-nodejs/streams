const fs = require('fs')
const split = require('split2')
const ora = require('ora')
const histogram = require('ascii-histogram')
const through2 = require('through2')
const reduce = require('through2-reduce')
const throttle = require('lodash.throttle')
const hydrate = require('./hydrate')

const spinner = ora('In progress...').start()

const source = fs.createReadStream('./data/data.csv')

const lineToObject = () => through2.obj(
  (line, enc, cb) => {
    const row = line.toString().split(',')
    const collision = hydrate(row)
    cb(null, collision)
  }
)

const weekdays = [ 0, 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun' ]

const renderText = (data) => `Collisions by weekday:\n` + histogram(data, {
  bar: '=', width: 30 })

const showProgress = throttle(renderText, 500)

const collisionsByWeekday = () => reduce.obj(
  (collisionsByWeekday, collision) => {
    const wd = collision.collisionDay
    const wdName = weekdays[wd]
    if (!wdName) { return collisionsByWeekday }
    const collisionsOnAWeekday = collisionsByWeekday[wdName] || 0
    const result = { ...collisionsByWeekday, [wdName]: collisionsOnAWeekday + 1 }
    spinner.text = showProgress(result)
    return result
  }, {}
)

const showSummary = () => through2.obj(
  (collisionsByWeekday, enc, cb) => {
    spinner.succeed(renderText(collisionsByWeekday))
    cb()
  }
)

source
  .pipe(split())
  .pipe(lineToObject())
  .pipe(collisionsByWeekday())
  .pipe(showSummary())
  .pipe(process.stdout)

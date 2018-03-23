const fs = require('fs')
const split = require('split2')
const ora = require('ora')
const histogram = require('ascii-histogram')
const through2 = require('through2')
const reduce = require('through2-reduce')
const throttle = require('lodash.throttle')
const hydrate = require('./hydrate')

const spinner = ora('In progress...').start()

const source = fs.createReadStream('./data/NCDB_1999_to_2015.csv')

const lineToObject = () => through2.obj(
  (line, enc, cb) => {
    const row = line.toString().split(',')
    const collision = hydrate(row)
    cb(null, collision)
  }
)

// Hours
const hours = new Set();
for (i = 0; i < 24; i++) { hours.add(i.toString().padStart(2, '0'))}

const renderText = (data) => `Collisions by hour:\n` + histogram(data, {
  bar: '=', width: 30, sort: true })

const showProgress = throttle(renderText, 500)

// Tallying collisions on an hourly basis
const collisionsByHour = () => reduce.obj(
  (collisionsByHour, collision) => {
    const hour = collision.collisionHour
    if (!hours.has(hour)) {return collisionsByHour}
    const collisionsInAnHour = collisionsByHour[hour] || 0
    const result = { ...collisionsByHour, [hour]: collisionsInAnHour + 1 }
    spinner.text = showProgress(result)
    return result
  }, {}
)

const showSummary = () => through2.obj(
  (collisionsByHour, enc, cb) => {
    spinner.succeed(renderText(collisionsByHour))
    cb()
  }
)

source
  .pipe(split())
  .pipe(lineToObject())
  .pipe(collisionsByHour())
  .pipe(showSummary())
  .pipe(process.stdout)

// ✔ Collisions by hour:
// 16 | ============================== | 548457         Most collisions occur 4-5pm.
// 17 | =============================  | 528075
// 15 | ============================   | 519447
// 14 | =======================        | 418870
// 18 | ======================         | 395696
// 12 | =====================          | 388433
// 13 | =====================          | 386981
// 08 | =================              | 319847
// 11 | =================              | 318741
// 19 | ================               | 295951
// 10 | ==============                 | 262847
// 09 | =============                  | 240604
// 20 | ============                   | 228302
// 07 | ============                   | 220403
// 21 | ============                   | 214410
// 22 | =========                      | 172769
// 23 | =======                        | 133462
// 06 | ======                         | 112244
// 00 | =====                          | 92417
// 02 | ====                           | 80065
// 01 | ====                           | 76366
// 03 | ====                           | 66325
// 05 | ===                            | 47597
// 04 | ==                             | 41449


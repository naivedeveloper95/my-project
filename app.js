let createError = require('http-errors')
let path = require('path')
let cookieParser = require('cookie-parser')
let bodyParser = require('body-parser')
let logger = require('morgan')
let express = require('express')
let mongoose = require('mongoose')
let cors = require('cors')
const mongoConfig = require('./configs/mongo-config')
let indexRouter = require('./routes/index')
let usersRouter = require('./routes/users')

//mongodb://heroku_8bd94qrf:irstf0rv1ds970eebtislm0apf@ds029638.mlab.com:29638/heroku_8bd94qrf
mongoose.connect(
  mongoConfig,
  { useNewUrlParser: true, useUnifiedTopology: true },
  (error) => {
    if (error) {
      throw error
    }
    console.log(`connect mongodb success`)
  }
)

let app = express()
app.use(cors())

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'jade')
app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())

//set static dir
app.use(express.static(path.join(__dirname, 'public')))

//routers
app.use('/', indexRouter)
app.use('/users', usersRouter)

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404))
})

// error handler
app.use(function (err, req, res, next) {
  // console.log(err);
  res.status(err.status || 500).json(err)
})

module.exports = app

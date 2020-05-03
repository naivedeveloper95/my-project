let mongoose = require('mongoose')
let bcrypt = require('bcryptjs')

let userSchema = mongoose.Schema({
  email: {
    type: String,
    index: true
  },
  password: {
    type: String
  },
  fullname: {
    type: String
  },
  admin: {
    type: String
  },
  cart: {
    type: Object
  }
})

let User = (module.exports = mongoose.model('User', userSchema))

module.exports.createUser = function (newUser, callback) {
  bcrypt.genSalt(10, function (err, salt) {
    bcrypt.hash(newUser.password, salt, function (err, hash) {
      newUser.password = hash
      newUser.save(callback)
    })
  })
}

module.exports.getUserByEmail = (email, callback) => {
  let query = { email: email }
  User.findOne(query, callback)
}

module.exports.getUserById = (id, callback) => {
  User.findById(id, callback)
}
module.exports.comparePassword = (givenPassword, hash, callback) => {
  bcrypt.compare(givenPassword, hash, (err, isMatch) => {
    if (err) {
      throw err
    }
    callback(null, isMatch)
  })
}

module.exports.getAllUsers = (callback) => {
  User.find(callback)
}

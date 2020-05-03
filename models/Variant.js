let mongoose = require('mongoose')

let variantSchema = mongoose.Schema({
  productID: {
    type: String
  },
  imagePath: {
    type: String
  },
  color: {
    type: String
  },
  size: {
    type: String
  },
  quantity: {
    type: Number
  },
  title: {
    type: String
  },
  price: {
    type: Number
  }
})

let Variant = (module.exports = mongoose.model('Variant', variantSchema))

module.exports.getVariantByID = (id, callback) => {
  Variant.findById(id, callback)
}

module.exports.getVariantProductByID = (id, callback) => {
  let query = { productID: id }
  Variant.find(query, callback)
}
module.exports.getAllVariants = (callback) => {
  Variant.find(callback)
}

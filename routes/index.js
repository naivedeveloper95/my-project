const express = require('express')
const router = express.Router()
const ensureAuthenticated = require('../modules/ensureAuthenticated')
const Product = require('../models/Product')
const Variant = require('../models/Variant')
const Department = require('../models/Department')
const Category = require('../models/Category')
const TypedError = require('../modules/ErrorHandler')
const Cart = require('../models/Cart')
const CartClass = require('../modules/Cart')
const paypalConfig = require('../configs/paypal-config')
const paypal = require('paypal-rest-sdk')

//GET /products
router.get('/products', (req, res, next) => {
  const { query, order } = categorizeQueryString(req.query)
  Product.getAllProducts(query, order, (e, products) => {
    if (e) {
      e.status = 406
      return next(e)
    }
    if (products.length < 1) {
      return res.status(404).json({ message: 'products not found' })
    }
    res.json({ products: products })
  })
})

//GET /products/:id
router.get('/products/:id', (req, res, next) => {
  let productId = req.params.id
  Product.getProductByID(productId, (e, item) => {
    if (e) {
      e.status = 404
      return next(e)
    } else {
      res.json({ product: item })
    }
  })
})

//GET /variants
router.get('/variants', (req, res, next) => {
  let { productId } = req.query
  if (productId) {
    Variant.getVariantProductByID(productId, (err, variants) => {
      if (err) {
        return next(err)
      }
      return res.json({ variants })
    })
  } else {
    Variant.getAllVariants((e, variants) => {
      if (e) {
        if (err) {
          return next(err)
        }
      } else {
        return res.json({ variants })
      }
    })
  }
})

//GET /variants/:id
router.get('/variants/:id', ensureAuthenticated, (req, res, next) => {
  let id = req.params.id
  if (id) {
    Variant.getVariantByID(id, (err, variants) => {
      if (err) {
        return next(err)
      }
      res.json({ variants })
    })
  }
})

//GET /departments
router.get('/departments', (req, res, next) => {
  Department.getAllDepartments((err, d) => {
    if (err) {
      return next(err)
    }
    res.status(200).json({ departments: d })
  })
})

//GET /categories
router.get('/categories', (req, res, next) => {
  Category.getAllCategories((err, c) => {
    if (err) {
      return next(err)
    }
    res.json({ categories: c })
  })
})

//GET /search?
router.get('/search', (req, res, next) => {
  const { query, order } = categorizeQueryString(req.query)
  query['department'] = query['query']
  delete query['query']
  Product.getProductByDepartment(query, order, (err, p) => {
    if (err) {
      return next(err)
    }
    if (p.length > 0) {
      return res.json({ products: p })
    } else {
      query['category'] = query['department']
      delete query['department']
      Product.getProductByCategory(query, order, (err, p) => {
        if (err) {
          return next(err)
        }
        if (p.length > 0) {
          return res.json({ products: p })
        } else {
          query['title'] = query['category']
          delete query['category']
          Product.getProductByTitle(query, order, (err, p) => {
            if (err) {
              return next(err)
            }
            if (p.length > 0) {
              return res.json({ products: p })
            } else {
              query['id'] = query['title']
              delete query['title']
              Product.getProductByID(query.id, (err, p) => {
                let error = new TypedError('search', 404, 'not_found', {
                  message: 'no product exist'
                })
                if (err) {
                  return next(error)
                }
                if (p) {
                  return res.json({ products: p })
                } else {
                  return next(error)
                }
              })
            }
          })
        }
      })
    }
  })
})

// GET filter
router.get('/filter', (req, res, next) => {
  let result = {}
  let query = req.query.query
  Product.filterProductByDepartment(query, (err, p) => {
    if (err) {
      return next(err)
    }
    if (p.length > 0) {
      result['department'] = generateFilterResultArray(p, 'department')
    }
    Product.filterProductByCategory(query, (err, p) => {
      if (err) {
        return next(err)
      }
      if (p.length > 0) {
        result['category'] = generateFilterResultArray(p, 'category')
      }
      Product.filterProductByTitle(query, (err, p) => {
        if (err) {
          return next(err)
        }
        if (p.length > 0) {
          result['title'] = generateFilterResultArray(p, 'title')
        }
        if (Object.keys(result).length > 0) {
          return res.json({ filter: result })
        } else {
          let error = new TypedError('search', 404, 'not_found', {
            message: 'no product exist'
          })
          return next(error)
        }
      })
    })
  })
})

//GET /checkout
router.get('/checkout/:cartId', ensureAuthenticated, (req, res, next) => {
  const cartId = req.params.cartId
  const frontURL = 'https://zack-ecommerce-reactjs.herokuapp.com'
  // const frontURL = 'http://localhost:3000'

  Cart.getCartById(cartId, (err, c) => {
    if (err) {
      return next(err)
    }
    if (!c) {
      let err = new TypedError('/checkout', 400, 'invalid_field', {
        message: 'cart not found'
      })
      return next(err)
    }
    const itemsArray = new CartClass(c).generateArray()
    const paypalList = []
    for (const i of itemsArray) {
      paypalList.push({
        name: i.item.title,
        price: i.item.price,
        currency: 'CAD',
        quantity: i.qty
      })
    }
    const createPaymentJson = {
      intent: 'sale',
      payer: {
        payment_method: 'paypal'
      },
      redirect_urls: {
        return_url: frontURL + '/success_page',
        cancel_url: frontURL + '/cancel_page'
      },
      transactions: [
        {
          item_list: {
            items: paypalList
          },
          amount: {
            currency: 'CAD',
            total: c.totalPrice
          },
          description: 'This is the payment description.'
        }
      ]
    }
    paypal.configure(paypalConfig)
    paypal.payment.create(createPaymentJson, (error, payment) => {
      if (error) {
        console.log(JSON.stringify(error))
        return next(error)
      } else {
        console.log(payment)
        for (const link of payment.links) {
          if (link.rel === 'approval_url') {
            res.json(link.href)
          }
        }
      }
    })
  })
})

//GET /payment/success
router.get('/payment/success', ensureAuthenticated, (req, res, next) => {
  let paymentId = req.query.paymentId
  let payerId = { payer_id: req.query.PayerID }
  paypal.payment.execute(paymentId, payerId, (error, payment) => {
    if (error) {
      console.error(JSON.stringify(error))
      return next(error)
    } else {
      if (payment.state === 'approved') {
        console.log('payment completed successfully')
        console.log(payment)
        res.json({ payment })
      } else {
        console.log('payment not successful')
      }
    }
  })
})

function generateFilterResultArray(products, targetProp) {
  let resultSet = new Set()
  for (const p of products) {
    resultSet.add(p[targetProp])
  }
  return Array.from(resultSet)
}

function categorizeQueryString(queryObj) {
  let query = {}
  let order = {}
  //extract query, order, filter value
  for (const i in queryObj) {
    if (queryObj[i]) {
      // extract order
      if (i === 'order') {
        order['sort'] = queryObj[i]
        continue
      }
      // extract range
      if (i === 'range') {
        let rangeArr = []
        let queryArr = []
        // multi ranges
        if (queryObj[i].constructor === Array) {
          for (const r of queryObj[i]) {
            rangeArr = r.split('-')
            queryArr.push({
              price: { $gt: rangeArr[0], $lt: rangeArr[1] }
            })
          }
        }
        // one range
        if (queryObj[i].constructor === String) {
          rangeArr = queryObj[i].split('-')
          queryArr.push({
            price: { $gt: rangeArr[0], $lt: rangeArr[1] }
          })
        }
        Object.assign(query, { $or: queryArr })
        delete query[i]
        continue
      }
      query[i] = queryObj[i]
    }
  }
  return { query, order }
}

module.exports = router

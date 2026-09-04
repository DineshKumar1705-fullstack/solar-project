const express = require('express');
const router = express.Router();
const {
  createCartItem,
  getAllCartItems,
  getCartItemById,
  updateCartItem,
  deleteCartItem,
  clearAllCartItems
} = require('../controllers/cartController');

router.post('/cart', createCartItem);
router.get('/cart', getAllCartItems);
router.get('/cart/:id', getCartItemById);
router.put('/cart/:id', updateCartItem);
router.delete('/cart/:id', deleteCartItem);
router.delete('/cart', clearAllCartItems);

module.exports = router;

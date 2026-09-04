const express = require('express');
const router = express.Router();
const { createStock, getAllStocks, getStockById, updateStock, deleteStock } = require('../controllers/stockController');

router.post('/stocks', createStock);
router.get('/stocks', getAllStocks);
router.get('/stocks/:id', getStockById);
router.put('/stocks/:id', updateStock);
router.delete('/stocks/:id', deleteStock);

module.exports = router;
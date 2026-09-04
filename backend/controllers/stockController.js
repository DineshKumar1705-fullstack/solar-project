const InStock = require('../models/InStock');

const createStock = async (req, res) => {
    try{
        const stock = await InStock.create(req.body);
        res.status(201).json(stock);
    }
    catch(err){
        console.error('Error creating stock:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

const getAllStocks = async (req, res) => {
    try{
        const stocks = await InStock.findAll();
        res.status(200).json(stocks);
    }
    catch(err){
        console.error('Error fetching stocks:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

const getStockById = async (req, res) => {
    try{
        const stock = await InStock.findByPk(req.params.id);
        if(stock){
            res.status(200).json(stock);
        } else {
            res.status(404).json({ error: 'Stock not found' });
        }
    }
    catch(err){
        console.error('Error fetching stock:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
    
}

const updateStock = async (req, res) => {
    try{
        const stock = await InStock.findByPk(req.params.id);
        if(stock){
            await stock.update(req.body);
            res.status(200).json(stock);
        } else {
            res.status(404).json({ error: 'Stock not found' });
        }
    }
    catch(err){
        console.error('Error updating stock:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

const deleteStock = async (req, res) => {
    try{
        const stock = await InStock.findByPk(req.params.id);
        if(stock){
            await stock.destroy();
            res.status(200).json({ message: 'Stock deleted successfully' });
        } else {
            res.status(404).json({ error: 'Stock not found' });
        }
    }
    catch(err){
        console.error('Error deleting stock:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { createStock, getAllStocks, getStockById, updateStock, deleteStock };
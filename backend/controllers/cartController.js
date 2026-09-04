const Cart = require('../models/Cart');

// Create new cart item
const createCartItem = async (req, res) => {
  try {
    const {
      Order_Date,
      Materials,
      Client_Site,
      Quantity,
      Unit,
      Vendor_Name,
      Status
    } = req.body;

    if (!Materials || !Materials.trim()) {
      return res.status(400).json({ error: 'Materials field is required.' });
    }

    const newItem = await Cart.create({
      Order_Date: Order_Date || new Date().toISOString().split('T')[0],
      Materials: Materials.trim(),
      Client_Site: Client_Site ? Client_Site.trim() : '',
      Quantity: Number(Quantity) || 1,
      Unit: Unit || 'Nos',
      Vendor_Name: Vendor_Name ? Vendor_Name.trim() : '',
      Status: Status || 'Yet to Start'
    });

    res.status(201).json(newItem);
  } catch (err) {
    console.error('Error creating cart item:', err);
    res.status(500).json({ error: 'Failed to add item to cart: ' + err.message });
  }
};

// Get all cart items
const getAllCartItems = async (req, res) => {
  try {
    const items = await Cart.findAll({
      order: [['ID', 'DESC']]
    });
    res.status(200).json(items);
  } catch (err) {
    console.error('Error fetching cart items:', err);
    res.status(500).json({ error: 'Failed to retrieve cart items' });
  }
};

// Get single cart item by ID
const getCartItemById = async (req, res) => {
  try {
    const item = await Cart.findByPk(req.params.id);
    if (!item) {
      return res.status(400).json({ error: 'Cart item not found' });
    }
    res.status(200).json(item);
  } catch (err) {
    console.error('Error fetching cart item:', err);
    res.status(500).json({ error: 'Failed to retrieve cart item' });
  }
};

// Update cart item
const updateCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Cart.findByPk(id);
    if (!item) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    const {
      Order_Date,
      Materials,
      Client_Site,
      Quantity,
      Unit,
      Vendor_Name,
      Status
    } = req.body;

    await item.update({
      Order_Date: Order_Date !== undefined ? Order_Date : item.Order_Date,
      Materials: Materials !== undefined ? Materials.trim() : item.Materials,
      Client_Site: Client_Site !== undefined ? Client_Site.trim() : item.Client_Site,
      Quantity: Quantity !== undefined ? Number(Quantity) : item.Quantity,
      Unit: Unit !== undefined ? Unit : item.Unit,
      Vendor_Name: Vendor_Name !== undefined ? Vendor_Name.trim() : item.Vendor_Name,
      Status: Status !== undefined ? Status : item.Status
    });

    res.status(200).json(item);
  } catch (err) {
    console.error('Error updating cart item:', err);
    res.status(500).json({ error: 'Failed to update cart item: ' + err.message });
  }
};

// Delete cart item
const deleteCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Cart.findByPk(id);
    if (!item) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    await item.destroy();
    res.status(200).json({ message: 'Cart item removed successfully' });
  } catch (err) {
    console.error('Error deleting cart item:', err);
    res.status(500).json({ error: 'Failed to delete cart item' });
  }
};

// Clear all cart items
const clearAllCartItems = async (req, res) => {
  try {
    await Cart.destroy({ where: {}, truncate: true });
    res.status(200).json({ message: 'All items removed from cart' });
  } catch (err) {
    console.error('Error clearing cart:', err);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
};

module.exports = {
  createCartItem,
  getAllCartItems,
  getCartItemById,
  updateCartItem,
  deleteCartItem,
  clearAllCartItems
};

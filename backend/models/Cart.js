const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Cart = sequelize.define('Cart', {
  ID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  Order_Date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  Materials: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  Client_Site: {
    type: DataTypes.STRING(250),
    allowNull: true
  },
  Quantity: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  Unit: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  Vendor_Name: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  Status: {
    type: DataTypes.ENUM(
      'Yet to Start',
      'Requested Vendor',
      'PO Proccessed',
      'Payment On Process',
      'Materials on Porter',
      'Material dispatched'
    ),
    allowNull: true,
    defaultValue: 'Yet to Start'
  }
}, {
  tableName: 'addtocart',
  timestamps: false
});

module.exports = Cart;

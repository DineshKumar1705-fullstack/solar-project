const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const IndentItem = sequelize.define('IndentItem', {
  ID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  Indent_ID: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  Materials: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  Quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  Unit: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'Nos'
  },
  Status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Ready to Issue'
  },
  PO_WO: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'indent_items',
  timestamps: false
});

module.exports = IndentItem;

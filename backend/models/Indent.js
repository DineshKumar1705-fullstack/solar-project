const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const IndentItem = require('./IndentItem');

const Indent = sequelize.define('Indent', {
  ID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  Indent_Date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  Indent_No: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  Site_Engineer: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  Client_Name: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  Status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'Ready to Issue'
  }
}, {
  tableName: 'indent_register',
  timestamps: false
});

// Associations
Indent.hasMany(IndentItem, { as: 'items', foreignKey: 'Indent_ID', onDelete: 'CASCADE' });
IndentItem.belongsTo(Indent, { foreignKey: 'Indent_ID' });

module.exports = Indent;

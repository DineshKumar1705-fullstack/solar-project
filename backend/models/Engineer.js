const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Engineer = sequelize.define('Engineer', {
  ID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  Name: {
    type: DataTypes.STRING(20),
    allowNull: false
  }
}, {
  tableName: 'engineers',
  timestamps: false
});

module.exports = Engineer;

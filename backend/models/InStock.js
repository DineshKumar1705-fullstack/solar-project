const {DataTypes} = require('sequelize');
const sequelize = require('../db');

const InStock = sequelize.define('InStock',{
    ID:{
        type:DataTypes.INTEGER,
        primaryKey:true,
        autoIncrement:true
    },
    Materials:{
        type:DataTypes.STRING,
        allowNull:false
    },
    Descriptions:{
        type:DataTypes.STRING,
        allowNull:false
    },
    Unit:{
        type:DataTypes.STRING,
        allowNull:false
    },
    In_Stock:{
        type:DataTypes.INTEGER,
    }
},{
    tableName:'in_stock',
    timestamps:false
});

module.exports = InStock;
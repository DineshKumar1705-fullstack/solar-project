const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DATABASE,
    process.env.USER,
    process.env.PASSWORD,
    {
        host: process.env.HOST,
        dialect: 'mysql'
    }
);

sequelize.authenticate()
    .then(() => {
        console.log(`Connected to the database ${process.env.DATABASE}`);
    })
    .catch((err) => {
        console.log('Error in connecting to the database:', err);
    });

module.exports = sequelize;
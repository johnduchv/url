// config/database.js
const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not defined in .env file');
    process.exit(1);
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    pool: {
        max: 30,
        min: 5,
        acquire: 30000,
        idle: 10000
    },
    dialectOptions: {
        connectTimeout: 60000,
        statement_timeout: 60000,
        idle_in_transaction_session_timeout: 60000
    }
});

// Test connection
sequelize
    .authenticate()
    .then(() => console.log('Database connected successfully.'))
    .catch(err => console.error('Unable to connect to database:', err));

module.exports = sequelize;
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Url = sequelize.define('Url', {
    originalUrl: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    shortUrl: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['shortUrl'],
            using: 'BTREE'
        },
        {
            unique: true,
            fields: ['originalUrl'],
            using: 'BTREE'
        }
    ]
});

module.exports = Url;
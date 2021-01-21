const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require("express-rate-limit");
const crypto = require('crypto');

const HMAC_KEY = process.env.HMAC_KEY || 'cupcakes';
const API_KEY = process.env.API_KEY || '12345';
const nodeEnv = process.env.NODE_ENV;

const dbSocketPath = process.env.DB_SOCKET_PATH || '/cloudsql';

const user = process.env.DB_USER;
const password = process.env.DB_PASS;
const database = process.env.DB_NAME;
const host = `${dbSocketPath}/${process.env.CLOUD_SQL_CONNECTION_NAME}`;

console.log({ user, password, database, host });

const sequelize = nodeEnv === 'test' ? 
    new Sequelize('sqlite::memory:') : 
    new Sequelize(database, user, password, {
        host: host,
        dialect: 'postgres'
    });

const SensorData = sequelize.define('sensorData', {
    serial: {
        type: DataTypes.STRING,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    temperature: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
})

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 10 // limit each IP to 10 requests per windowMs
});

const app = express();
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(limiter);

app.use((req, res, next) => {
    let key = req.query.key;
    if(!key || key !== API_KEY) {
        res.status(403).send('Bad API Key');
        return;
    }
    next();
});

app.get('/data', async (req, res) => {
    let limit = req.query.limit || 5;
    let offset = req.query.offset || 0;
    const allData = await SensorData.findAll({ limit, offset });
    res.status(200).send(allData);
    return;
});

app.post('/data', async (req, res) => {
    let data = req.body;
    let hmac = req.headers['hmac'];
    if(!hmac) {
        res.status(403).send('No HMAC');
        return;
    }
    let hmacExpected = crypto.createHmac('sha1', HMAC_KEY)
        .update(JSON.stringify(data))
        .digest('hex');
    let hmacEqual = crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(hmacExpected));
    if(!hmacEqual) {
        res.status(403).send('Bad HMAC');
        return;
    }
    const sensorData = await SensorData.create(data);
    res.status(201).send(sensorData);
    return;
});

module.exports = { app, sequelize };

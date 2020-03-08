const express = require('express');
const api = express();

api.get('/hello', (req, res) => {
    res.send({ message: 'hello, world.' });
});

api.post('/hello', (req, res) => {
    let data = req.body;
    res.send({ message: 'hello, world.' });
});

module.exports = api;

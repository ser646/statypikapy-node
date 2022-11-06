const express = require('express');
const app = express();
const path = require('path');

const port = process.env.PORT || 8080;
process.env.DB_NAME = 'statypikapy';
process.env.STEAM_API_KEY = '267FB2F936B7E751461C93258EEBF0D4';
process.env.MONGODB_URI = 'mongodb+srv://ser646:Sebas646@cluster0.kgp41.mongodb.net/statypikapy?retryWrites=true&w=majority';

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, '../site/index.html'));
});

app.use('/api/logs', require("./api/logs.js"));

app.listen(port);
module.exports = app;
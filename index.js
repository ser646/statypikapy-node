require("dotenv").config()
const http = require('http');
const express = require('express');
const app = express();
const path = require('path');

// Constants
const PORT = 8080;
const HOST = 'localhost';

app.use(express.json());
app.use('/', express.static('public'))

app.use('/api/logs', require("./api/logs.js"));
app.use('/api/hof', require("./api/hof.js"));
app.use('/api/scores/', require("./api/scores.js"));
app.use('/api/player_logs/', require("./api/player_logs.js"));
app.use('/api/profile/', require("./api/profile.js"));

const server = http.createServer(app);
server.listen(PORT, HOST, () => {
  console.log(`Running on http://${HOST}:${PORT}`);
});

module.exports = app;
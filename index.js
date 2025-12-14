require("dotenv").config();
const http = require("http");
const express = require("express");
const app = express();
const path = require("path");

// Constants
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || "localhost";

app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));
app.use("/public", express.static(path.join(__dirname, "public")));

// API routes
app.use("/api/logs", require("./api/logs.js"));
app.use("/api/hof", require("./api/hof.js"));
app.use("/api/scores/", require("./api/scores.js"));
app.use("/api/player_logs/", require("./api/player_logs.js"));
app.use("/api/profile/", require("./api/profile.js"));

// Fallback route for SPA - serves index.html for any non-API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const server = http.createServer(app);
server.listen(PORT, HOST, () => {
  console.log(`Running on http://${HOST}:${PORT}`);
});

module.exports = app;

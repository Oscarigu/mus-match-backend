const express = require("express");
const router = express.Router();
const mongoose = require("mongoose")

// Root route
router.get("/", (req, res) => {
  res.json("All good in here");
});

// GET /health 
router.get('/health', (req, res) => {
  // send ping to prevent inactivity on mongodb atlas
  mongoose.connection.db.admin().ping()
    .then( () => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString()
      });
    })
    .catch(err => {
      console.error('MongoDB ping failed:', err);
      res.status(500).json({
        status: 'error',
        message: 'Failed to connect to MongoDB',
      });
    });
});


// Import resource routes
const gameRoutes = require("./game.routes");
const conversationRoutes = require("./conversation.routes");

// Mount routes
router.use("/games", gameRoutes);
router.use("/conversations", conversationRoutes);

module.exports = router;

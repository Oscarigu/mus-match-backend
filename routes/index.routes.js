const express = require("express");
const router = express.Router();

// Root route
router.get("/", (req, res) => {
  res.json("All good in here");
});

// Import resource routes
const gameRoutes = require("./game.routes");
const conversationRoutes = require("./conversation.routes");

// Mount routes
router.use("/games", gameRoutes);
router.use("/conversations", conversationRoutes);

module.exports = router;

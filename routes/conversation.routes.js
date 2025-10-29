const express = require("express");
const router = express.Router();
const Conversation = require("../models/Conversation.model");
const { isAuthenticated } = require("../middleware/jwt.middleware.js");

// ✅ Get a conversation (only if user is part of it)
router.get("/:conversationId", isAuthenticated, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.payload._id;

    const conversation = await Conversation.findById(conversationId)
      .populate("game")
      .populate("users", "name email")
      .populate("messages.user", "name email");

    if (!conversation) return res.status(404).json({ error: "Conversation not found" });

    const isUserAllowed = conversation.users.some(
      (u) => u._id.toString() === userId
    );
    if (!isUserAllowed)
      return res.status(403).json({ error: "You are not allowed to view this conversation" });

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Send a message (only if conversation unlocked + user is in it)
router.post("/:conversationId/message", isAuthenticated, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.payload._id;
    const { message } = req.body;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    if (conversation.isLocked)
      return res.status(403).json({ error: "Conversation is locked until all players join" });

    const isUserAllowed = conversation.users.some(
      (u) => u.toString() === userId
    );
    if (!isUserAllowed)
      return res.status(403).json({ error: "You are not part of this conversation" });

    conversation.messages.push({ user: userId, message });
    await conversation.save();

    res.status(201).json(conversation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all conversations or by game
router.get('/', async (req, res) => {
  try {
    const { game } = req.query;
    const filter = game ? { game } : {};
    const conversations = await Conversation.find(filter)
      .populate('game')
      .populate('users')
      .populate('messages.user');
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;

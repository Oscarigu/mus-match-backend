const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation.model');

// Get all conversations
router.get('/', async (req, res) => {
  try {
    const conversations = await Conversation.find()
      .populate('game')
      .populate('users')
      .populate('messages.user');
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post a new message to a conversation
router.post('/:conversationId/message', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { user, message } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.messages.push({ user, message });
    await conversation.save();

    res.status(201).json(conversation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

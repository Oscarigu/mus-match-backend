const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const messageSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  sentAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false }); // no need for separate _id on each message

const conversationSchema = new Schema({
  game: {
    type: Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  users: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  messages: [messageSchema]
}, {
  timestamps: true // adds createdAt and updatedAt
});

// Optional: ensure all game users are part of the conversation
conversationSchema.pre('save', function(next) {
  if (!this.users || this.users.length === 0) {
    return next(new Error('Conversation must include users.'));
  }
  next();
});

module.exports = model('Conversation', conversationSchema);

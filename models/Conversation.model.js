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
}, { _id: false });

const conversationSchema = new Schema({
  game: {
    type: Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },

  // Players participating in this conversation
  users: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],

  messages: [messageSchema],

  // 🔒 NEW FIELD: lock conversation until all 4 players joined
  isLocked: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// ✅ Validation: ensure users exist
conversationSchema.pre('save', function(next) {
  if (!this.users || this.users.length === 0) {
    return next(new Error('Conversation must include users.'));
  }
  next();
});

// ✅ Optional helper: unlock when all 4 players are present
conversationSchema.methods.unlockIfReady = async function() {
  if (this.users.length === 4 && this.isLocked) {
    this.isLocked = false;
    await this.save();
  }
};

module.exports = model('Conversation', conversationSchema);

const { Schema, model } = require("mongoose");

// TODO: Please make sure you edit the User model to whatever makes sense in this case
const gameSchema = new Schema(
  {
    teamA: [
      {
        type: Schema.Types.ObjectId,
        ref: "User", // referencia al modelo User
        required: true,
      },
    ],
    teamB: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    location: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true
    },
    host:{
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true, // agrega createdAt y updatedAt automáticamente
  }
);

const Game = model("Game", gameSchema);

module.exports = Game;

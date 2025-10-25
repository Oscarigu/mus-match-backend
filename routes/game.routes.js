const express = require("express");
const router = express.Router();

const Game = require("../models/Game.model");
const Conversation = require("../models/Conversation.model");
const { isAuthenticated } = require("../middleware/jwt.middleware.js");

// ✅ CREATE new game (only logged users)
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const userId = req.payload._id;
    const { location, date } = req.body;

    if (!location || !date) {
      return res.status(400).json({ message: "Location and date are required." });
    }

    // Crea el nuevo juego con el creador como host
    const newGame = await Game.create({
      teamA: [userId],
      teamB: [],
      location,
      date,
      host: userId,
    });

    // Crea la conversación vinculada
    await Conversation.create({
      game: newGame._id,
      users: [userId],
      messages: [],
    });

    res.status(201).json({ message: "Game created successfully", game: newGame });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ JOIN existing game
router.put("/:id/join", isAuthenticated, async (req, res) => {
  try {
    const userId = req.payload._id;
    const game = await Game.findById(req.params.id);

    if (!game) return res.status(404).json({ message: "Game not found" });

    // Verifica si ya está en el juego
    const alreadyInGame =
      game.teamA.some(id => id.toString() === userId) ||
      game.teamB.some(id => id.toString() === userId);

    if (alreadyInGame) {
      return res.status(400).json({ message: "You are already in this game" });
    }

    // Agrega al jugador al primer equipo disponible (máximo 2 por equipo)
    if (game.teamA.length < 2) {
      game.teamA.push(userId);
    } else if (game.teamB.length < 2) {
      game.teamB.push(userId);
    } else {
      return res.status(400).json({ message: "Both teams are full" });
    }

    await game.save();

    // Agrega al usuario en la conversación
    await Conversation.findOneAndUpdate(
      { game: game._id },
      { $addToSet: { users: userId } }
    );

    res.json({ message: "Joined the game successfully", game });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ UPDATE game info (only host)
router.put("/:id", isAuthenticated, async (req, res) => {
  try {
    const userId = req.payload._id;
    console.log(userId);
    const { location, date } = req.body;

    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: "Game not found" });

    // Solo el host actual puede editar
    if (game.host.toString() !== userId) {
      return res.status(403).json({ message: "Only the host can update this game" });
    }

    if (location) game.location = location;
    if (date) game.date = date;

    await game.save();
    res.json({ message: "Game updated successfully", game });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ LEAVE a game (delete game if empty, transfer host if needed)
router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const userId = req.payload._id;
    const gameId = req.params.id;

    const game = await Game.findById(gameId);
    if (!game) return res.status(404).json({ message: "Game not found" });

    const isInTeamA = game.teamA.some(id => id.toString() === userId);
    const isInTeamB = game.teamB.some(id => id.toString() === userId);

    if (!isInTeamA && !isInTeamB) {
      return res.status(403).json({ message: "You are not part of this game" });
    }

    // Elimina al usuario de su equipo
    if (isInTeamA)
      game.teamA = game.teamA.filter(id => id.toString() !== userId);
    if (isInTeamB)
      game.teamB = game.teamB.filter(id => id.toString() !== userId);

    let newHost = null;

    // Si el host se fue → reasignar a otro jugador
    if (game.host.toString() === userId) {
      if (game.teamA.length > 0) {
        newHost = game.teamA[0];
      } else if (game.teamB.length > 0) {
        newHost = game.teamB[0];
        game.teamA.push(game.teamB.shift()); // mover jugador al teamA
      }
      if (newHost) game.host = newHost;
    }

    // Si no quedan jugadores → eliminar todo
    if (game.teamA.length === 0 && game.teamB.length === 0) {
      await Game.findByIdAndDelete(gameId);
      await Conversation.findOneAndDelete({ game: gameId });
      return res.json({ message: "Game and conversation deleted (no players left)" });
    }

    await game.save();

    // Quitar de la conversación
    await Conversation.findOneAndUpdate(
      { game: gameId },
      { $pull: { users: userId } }
    );

    res.json({
      message: "You left the game",
      newHost: newHost ? newHost.toString() : null,
      game,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ GET all games
router.get("/", async (req, res) => {
  try {
    const games = await Game.find()
      .populate("teamA teamB host", "name email")
      .sort({ date: 1 });
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

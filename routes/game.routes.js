const express = require("express");
const router = express.Router();
const Game = require("../models/Game.model");
const Conversation = require("../models/Conversation.model");
const { isAuthenticated } = require("../middleware/jwt.middleware.js");

// ✅ CREATE new game
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const userId = req.payload._id;
    const { localidad, location, date } = req.body;

    if (!localidad || !location || !date) {
      return res.status(400).json({ message: "Location and date are required." });
    }

    // Create game
    const newGame = await Game.create({
      teamA: [userId],
      teamB: [],
      localidad,
      location,
      date,
      host: userId,
    });

    // Create conversation (locked until 4 players)
    await Conversation.create({
      game: newGame._id,
      users: [userId],
      isLocked: true,
      messages: []
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
    const { team } = req.body;
    const game = await Game.findById(req.params.id);

    if (!game) return res.status(404).json({ message: "Game not found" });

    // Check if already in game
    const alreadyInGame =
      game.teamA.some((id) => id.toString() === userId) ||
      game.teamB.some((id) => id.toString() === userId);

    if (alreadyInGame) {
      return res.status(400).json({ message: "You are already in this game" });
    }

    const teamAFull = game.teamA.length >= 2;
    const teamBFull = game.teamB.length >= 2;

    if (teamAFull && teamBFull) {
      return res.status(400).json({ message: "Both teams are full" });
    }

    // Assign team
    if (team === "A") {
      if (teamAFull) return res.status(400).json({ message: "Team A is full" });
      game.teamA.push(userId);
    } else if (team === "B") {
      if (teamBFull) return res.status(400).json({ message: "Team B is full" });
      game.teamB.push(userId);
    } else {
      if (!teamAFull) game.teamA.push(userId);
      else game.teamB.push(userId);
    }

    await game.save();

    // Update conversation
    const conversation = await Conversation.findOneAndUpdate(
      { game: game._id },
      { $addToSet: { users: userId } },
      { new: true }
    );

    // Unlock if 4 players joined
    if (conversation) {
      conversation.isLocked = (game.teamA.length + game.teamB.length) < 4;
      await conversation.save();
    }

    res.json({ message: "Joined the game successfully", game });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Leave game (with cleanup + host reassignment)
router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const userId = req.payload._id;
    const gameId = req.params.id;

    const game = await Game.findById(gameId);
    if (!game) return res.status(404).json({ message: "Game not found" });

    const isInTeamA = game.teamA.some((id) => id.toString() === userId);
    const isInTeamB = game.teamB.some((id) => id.toString() === userId);

    if (!isInTeamA && !isInTeamB) {
      return res.status(403).json({ message: "You are not part of this game" });
    }

    if (isInTeamA)
      game.teamA = game.teamA.filter((id) => id.toString() !== userId);
    if (isInTeamB)
      game.teamB = game.teamB.filter((id) => id.toString() !== userId);

    let newHost = null;

    if (game.host.toString() === userId) {
      if (game.teamA.length > 0) {
        newHost = game.teamA[0];
      } else if (game.teamB.length > 0) {
        newHost = game.teamB[0];
        game.teamA.push(game.teamB.shift());
      }
      if (newHost) game.host = newHost;
    }

    if (game.teamA.length === 0 && game.teamB.length === 0) {
      await Game.findByIdAndDelete(gameId);
      await Conversation.findOneAndDelete({ game: gameId });
      return res.json({ message: "Game and conversation deleted (no players left)" });
    }

    await game.save();

    // Update conversation
    const conversation = await Conversation.findOneAndUpdate(
      { game: gameId },
      { $pull: { users: userId }, isLocked: true }, // lock again if < 4 players
      { new: true }
    );

    res.json({
      message: "You left the game",
      newHost: newHost ? newHost.toString() : null,
      game,
      conversation,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get all games
router.get("/", async (req, res) => {
  try {
    const games = await Game.find()
      .populate("teamA teamB host", "name email")
      .sort({ date: 1 });

    const formattedGames = games.map((game) => ({
      id: game._id,
      date: game.date,
      localidad: game.localidad,
      nPlayers: game.teamA.length + game.teamB.length,
    }));

    res.json(formattedGames);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get single game
router.get("/:id", async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate("teamA teamB host", "name email");
    if (!game) return res.status(404).json({ message: "Game not found" });

    res.json({
      id: game._id,
      date: game.date,
      localidad: game.localidad,
      location: game.location,
      host: game.host,
      teamA: game.teamA,
      teamB: game.teamB,
      nPlayers: game.teamA.length + game.teamB.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ UPDATE game details (only host can edit)
router.put("/:id", isAuthenticated, async (req, res) => {
  try {
    const userId = req.payload._id;
    const { id } = req.params;
    const { localidad, location, date } = req.body;

    const game = await Game.findById(id);
    if (!game) return res.status(404).json({ message: "Game not found" });

    // Only host can update
    if (game.host.toString() !== userId) {
      return res.status(403).json({ message: "Only the host can edit this game" });
    }

    if (!localidad || !location || !date) {
      return res.status(400).json({ message: "All fields are required" });
    }

    game.localidad = localidad;
    game.location = location;
    game.date = date;

    await game.save();

    res.json({ message: "Game updated successfully", game });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;

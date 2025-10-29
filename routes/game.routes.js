const express = require("express");
const router = express.Router();

const Game = require("../models/Game.model");
const Conversation = require("../models/Conversation.model");
const { isAuthenticated } = require("../middleware/jwt.middleware.js");

// ✅ CREATE new game (only logged users)
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const userId = req.payload._id;
    const { localidad, location, date } = req.body;

    if (!localidad || !location || !date) {
      return res
        .status(400)
        .json({ message: "Location and date are required." });
    }

    // Crea el nuevo juego con el creador como host
    const newGame = await Game.create({
      teamA: [userId],
      teamB: [],
      localidad,
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

    res
      .status(201)
      .json({ message: "Game created successfully", game: newGame });
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

    // Verifica si ya está en el juego
    const alreadyInGame =
      game.teamA.some((id) => id.toString() === userId) ||
      game.teamB.some((id) => id.toString() === userId);

    if (alreadyInGame) {
      return res.status(400).json({ message: "You are already in this game" });
    }
    // 🧠 Verifica si ambos equipos están llenos
    const teamAFull = game.teamA.length >= 2;
    const teamBFull = game.teamB.length >= 2;

    if (teamAFull && teamBFull) {
      return res.status(400).json({ message: "Both teams are full" });
    }

    // 🟩 Lógica actualizada para elegir equipo
    if (team === "A") {
      if (teamAFull)
        return res.status(400).json({ message: "Team A is already full" });
      game.teamA.push(userId);
    } else if (team === "B") {
      if (teamBFull)
        return res.status(400).json({ message: "Team B is already full" });
      game.teamB.push(userId);
    } else {
      // Si no se especifica, asigna automáticamente al primer equipo con hueco
      if (!teamAFull) {
        game.teamA.push(userId);
      } else {
        game.teamB.push(userId);
      }
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
    const { location, localidad, date } = req.body;

    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: "Game not found" });

    // Solo el host actual puede editar
    if (game.host.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Only the host can update this game" });
    }

    if (location) game.location = location;
    if (localidad) game.localidad = localidad;
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

    const isInTeamA = game.teamA.some((id) => id.toString() === userId);
    const isInTeamB = game.teamB.some((id) => id.toString() === userId);

    if (!isInTeamA && !isInTeamB) {
      return res.status(403).json({ message: "You are not part of this game" });
    }

    // Elimina al usuario de su equipo
    if (isInTeamA)
      game.teamA = game.teamA.filter((id) => id.toString() !== userId);
    if (isInTeamB)
      game.teamB = game.teamB.filter((id) => id.toString() !== userId);

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
      return res.json({
        message: "Game and conversation deleted (no players left)",
      });
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

// ✅ GET single game by ID
router.get("/:id", async (req, res) => {
  try {
    const game = await Game.findById(req.params.id).populate(
      "teamA teamB host",
      "name email"
    );

    if (!game) return res.status(404).json({ message: "Game not found" });

    const formattedGame = {
      id: game._id,
      date: game.date,
      localidad: game.localidad,
      location: game.location,
      host: game.host,
      teamA: game.teamA,
      teamB: game.teamB,
      nPlayers: game.teamA.length + game.teamB.length,
    };

    res.json(formattedGame);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

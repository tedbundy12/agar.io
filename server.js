const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const MAP_SIZE = 1000;
const BASE_RADIUS = 50;
const MIN_EAT_RADIUS_DIFFERENCE = 1.2;
const FOOD_COUNT = 50;

const players = {};
const food = [];

const generateBrightColor = () =>
  `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;

const generateFood = () => {
  food.length = 0;
  for (let i = 0; i < FOOD_COUNT; i++) {
    food.push({
      x: Math.random() * MAP_SIZE,
      y: Math.random() * MAP_SIZE,
      radius: 5,
      color: generateBrightColor(),
    });
  }
};

const respawnPlayer = (socketId) => {
  players[socketId] = {
    x: Math.random() * MAP_SIZE,
    y: Math.random() * MAP_SIZE,
    radius: BASE_RADIUS,
    color: generateBrightColor(),
    name: `Guest ${socketId.slice(0, 5)}`,
  };
};

const calculateDistance = (a, b) =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

const isFullyAbsorbed = (smaller, larger) =>
  calculateDistance(smaller, larger) + smaller.radius <= larger.radius;

const handleFoodCollision = (player) => {
  for (let i = food.length - 1; i >= 0; i--) {
    if (calculateDistance(player, food[i]) < player.radius + food[i].radius) {
      player.radius += 1;
      food.splice(i, 1);
    }
  }
};

const handlePlayerCollisions = (socket) => {
  const player = players[socket.id];
  Object.keys(players).forEach((id) => {
    if (id === socket.id) return;

    const other = players[id];
    if (
      player.radius >= other.radius * MIN_EAT_RADIUS_DIFFERENCE &&
      isFullyAbsorbed(other, player)
    ) {
      player.radius += other.radius / 2;
      delete players[id];
      io.to(id).emit("player_eaten");
    } else if (
      other.radius >= player.radius * MIN_EAT_RADIUS_DIFFERENCE &&
      isFullyAbsorbed(player, other)
    ) {
      other.radius += player.radius / 2;
      delete players[socket.id];
      socket.emit("player_eaten");
    }
  });
};

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);
  respawnPlayer(socket.id);
  socket.emit("init", { players, food });

  socket.on("move", (data) => {
    const player = players[socket.id];
    if (!player) return;

    player.x = Math.min(MAP_SIZE, Math.max(0, data.x));
    player.y = Math.min(MAP_SIZE, Math.max(0, data.y));

    handleFoodCollision(player);
    handlePlayerCollisions(socket);

    io.emit("update", { players, food });
  });

  socket.on("respawn", () => {
    respawnPlayer(socket.id);
    socket.emit("init", { players, food });
  });

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
  });
});

setInterval(() => {
  if (food.length < FOOD_COUNT) {
    food.push({
      x: Math.random() * MAP_SIZE,
      y: Math.random() * MAP_SIZE,
      radius: 5,
      color: generateBrightColor(),
    });
  }
  io.emit("update", { players, food });
}, 1000 / 30);

app.use(express.static("public"));
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
generateFood();

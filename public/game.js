const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const socket = io();

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let players = {};
let food = [];
const mouse = { x: 0, y: 0 };

const MAX_SPEED = 10;
const MIN_SPEED = 5;
const SPEED_REDUCTION_FACTOR = 0.1;

const calculateSpeed = (radius) =>
  Math.max(MIN_SPEED, MAX_SPEED - radius * SPEED_REDUCTION_FACTOR);

const drawCircle = (x, y, radius, color, offsetX, offsetY) => {
  ctx.beginPath();
  ctx.arc(x + offsetX, y + offsetY, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.closePath();
};

const drawPlayers = () => {
  const myPlayer = players[socket.id];
  if (!myPlayer) return;

  const offsetX = canvas.width / 2 - myPlayer.x;
  const offsetY = canvas.height / 2 - myPlayer.y;

  Object.values(players)
    .sort((a, b) => b.radius - a.radius)
    .forEach((player) => {
      drawCircle(
        player.x,
        player.y,
        player.radius,
        player.color,
        offsetX,
        offsetY
      );
      ctx.font = "14px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        player.name || "Guest",
        player.x + offsetX,
        player.y + offsetY - player.radius - 10
      );
    });
};

function drawPlayerNamesAndScores() {
  const myPlayer = players[socket.id];
  if (!myPlayer) return;

  const offsetX = canvas.width / 2 - myPlayer.x;
  const offsetY = canvas.height / 2 - myPlayer.y;

  // Настройки текста
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  Object.values(players).forEach((player) => {
    const playerX = player.x + offsetX;
    const playerY = player.y + offsetY;

    // Никнейм игрока
    ctx.font = "bold 14px Arial";
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillText(player.name || "Guest", playerX, playerY - player.radius - 10);
    ctx.fillStyle = "#fff";
    ctx.fillText(player.name || "Guest", playerX, playerY - player.radius - 10);

    // Счётчик массы
    ctx.font = "12px Arial";
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillText(
      `${Math.round(player.radius)}`,
      playerX,
      playerY - player.radius - 25
    );
    ctx.fillStyle = "#fff";
    ctx.fillText(
      `${Math.round(player.radius)}`,
      playerX,
      playerY - player.radius - 25
    );
  });
}

function drawLeaderboard() {
  const leaderboard = Object.values(players)
    .sort((a, b) => b.radius - a.radius)
    .slice(0, 5);

  // Рисуем лидерборд в правом верхнем углу
  const startX = canvas.width - 150; // Отступ от правой границы
  const startY = 20; // Отступ от верхней границы

  ctx.font = "16px Arial";
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.fillText("Лидеры:", startX, startY);

  leaderboard.forEach((player, index) => {
    const text = `${index + 1}. ${player.name || "Guest"} - ${Math.round(
      player.radius
    )}`;
    ctx.fillText(text, startX, startY + 20 + index * 20);
  });
}

const drawFood = () => {
  const myPlayer = players[socket.id];
  if (!myPlayer) return;

  const offsetX = canvas.width / 2 - myPlayer.x;
  const offsetY = canvas.height / 2 - myPlayer.y;

  food.forEach((f) =>
    drawCircle(f.x, f.y, f.radius, f.color, offsetX, offsetY)
  );
};

canvas.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

const updatePlayerMovement = () => {
  const myPlayer = players[socket.id];
  if (!myPlayer) return;

  const dx = mouse.x - canvas.width / 2;
  const dy = mouse.y - canvas.height / 2;
  const distance = Math.sqrt(dx ** 2 + dy ** 2);

  if (distance > 0) {
    const speed = calculateSpeed(myPlayer.radius);
    const x = myPlayer.x + (dx / distance) * speed;
    const y = myPlayer.y + (dy / distance) * speed;
    socket.emit("move", { x, y });
  }
};

const animate = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updatePlayerMovement();
  drawFood();
  drawPlayers();
  drawLeaderboard()
  requestAnimationFrame(animate);
};

socket.on("init", (data) => {
  players = data.players;
  food = data.food;
});

socket.on("update", (data) => {
  players = data.players;
  food = data.food;
});

animate();

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const socket = io();

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let players = {};
let food = [];
let playerId = null;
let mousePosition = { x: 0, y: 0 };

// Параметры скорости
const MAX_SPEED = 10; // Максимальная начальная скорость
const MIN_SPEED = 5; // Минимальная скорость для больших игроков
const SPEED_REDUCTION_FACTOR = 0.1; // Коэффициент уменьшения скорости

function drawPlayers() {
  const myPlayer = players[socket.id];
  if (!myPlayer) return;

  const offsetX = canvas.width / 2 - myPlayer.x;
  const offsetY = canvas.height / 2 - myPlayer.y;

  // Сортируем игроков по радиусу (от большего к меньшему)
  const sortedPlayers = Object.values(players).sort(
    (a, b) => b.radius - a.radius
  );

  sortedPlayers.forEach((player) => {
    ctx.beginPath();
    ctx.arc(
      player.x + offsetX,
      player.y + offsetY,
      player.radius,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.closePath();
  });
}

// Остальные функции отрисовки остаются без изменений
function drawFood() {
  const myPlayer = players[socket.id];
  if (!myPlayer) return;

  const offsetX = canvas.width / 2 - myPlayer.x;
  const offsetY = canvas.height / 2 - myPlayer.y;

  food.forEach((f) => {
    ctx.beginPath();

    // Создаем полупрозрачную тень для объема
    ctx.shadowColor = f.color;
    ctx.shadowBlur = 10;

    // Рисуем основной круг еды
    ctx.arc(f.x + offsetX, f.y + offsetY, f.radius, 0, Math.PI * 2);
    ctx.fillStyle = f.color;
    ctx.fill();

    // Сбрасываем тень
    ctx.shadowBlur = 0;

    // Тонкая белесая обводка для контраста
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.stroke();

    ctx.closePath();
  });
}

// how to draw player name
// Отображение имени игрока
// Отображение имени игрока
function drawPlayerNames() {
  const myPlayer = players[socket.id];
  if (!myPlayer) return;

  const offsetX = canvas.width / 2 - myPlayer.x;
  const offsetY = canvas.height / 2 - myPlayer.y;

  // Настройки текста
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  Object.values(players).forEach((player) => {
    // Расчет позиции текста по центру круга игрока
    const textX = player.x + offsetX;
    const textY = player.y + offsetY;

    // Установка белого цвета с легкой тенью для лучшей читаемости
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillText(player.name || 'Guest', textX, textY);

    ctx.fillStyle = "#fff";
    ctx.fillText(player.name || 'Guest', textX, textY);

    // Счетчик массы чуть ниже имени
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillText(`${Math.round(player.radius)}`, textX, textY + 20);

    ctx.fillStyle = "#fff";
    ctx.fillText(`${Math.round(player.radius)}`, textX, textY + 20);
  });
}

// Отображение массы игрока
function drawScore() {
  const myPlayer = players[socket.id];

  const offsetX = canvas.width / 2 - myPlayer.x;
  const offsetY = canvas.height / 2 - myPlayer.y;

  // Рассчитываем размер шрифта в зависимости от радиуса игрока
  const fontSize = Math.max(12, myPlayer.radius * 0.5); // Минимальный размер шрифта 12, иначе 50% от радиуса

  ctx.fillStyle = "#fff";
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = "center"; // Центрируем текст по горизонтали
  ctx.textBaseline = "middle"; // Центрируем текст по вертикали

  // Рисуем массу игрока (радиус) чуть ниже ника
  ctx.fillText(
    `${Math.round(players[socket.id].radius)}`,
    myPlayer.x + offsetX,
    myPlayer.y + offsetY - 5 + fontSize + 5 // Смещаем счет ниже
  );
}

function drawLeaderboard() {
  const leaderboard = Object.values(players)
    .sort((a, b) => b.radius - a.radius)
    .slice(0, 5);

  ctx.fillStyle = "#fff";
  ctx.font = "16px Arial";
  ctx.fillText("Лидерборд:", 100, 20);

  leaderboard.forEach((player, index) => {
    ctx.fillText(
      `${index + 1}. ${player.color} - ${Math.round(player.radius)}`,
      100,
      50 + index * 20
    );
  });
}

socket.on("init", (data) => {
  players = data.players;
  food = data.food;
  playerId = socket.id;
});

socket.on("update", (data) => {
  players = data.players;
  food = data.food;
});

canvas.addEventListener("mousemove", (e) => {
  if (!players[socket.id]) return;

  mousePosition.x = e.clientX;
  mousePosition.y = e.clientY;
});

function updatePlayerMovement() {
  if (!players[socket.id]) return;

  const myPlayer = players[socket.id];

  // Динамический расчет скорости в зависимости от размера
  const currentSpeed = calculateSpeed(myPlayer.radius);

  // Разница между текущими координатами игрока и курсором
  const dx = mousePosition.x - canvas.width / 2;
  const dy = mousePosition.y - canvas.height / 2;

  // Расстояние между игроком и курсором
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Если дистанция больше 0, то движемся в сторону курсора
  if (distance > 0) {
    const speedX = (dx / distance) * currentSpeed;
    const speedY = (dy / distance) * currentSpeed;

    // Обновляем позицию игрока
    const x = myPlayer.x + speedX;
    const y = myPlayer.y + speedY;

    socket.emit("move", { x, y });
  }
}

// Функция для расчета скорости в зависимости от радиуса
function calculateSpeed(radius) {
  // Уменьшаем скорость по мере роста радиуса
  // Используем формулу: MAX_SPEED - (radius * SPEED_REDUCTION_FACTOR)
  // Но не опускаемся ниже MIN_SPEED
  const speed = Math.max(
    MIN_SPEED,
    MAX_SPEED - radius * SPEED_REDUCTION_FACTOR
  );

  return speed;
}

function animate() {
  if (!players[socket.id]) {
    requestAnimationFrame(animate);
    return;
  }

  updatePlayerMovement();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawFood();
  drawPlayers();
  drawLeaderboard();
  drawPlayerNames();
  //   drawScore();
  requestAnimationFrame(animate);
}

animate();

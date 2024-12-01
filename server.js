const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const MAP_SIZE = 1000;
const players = {};
const food = [];

// Параметры игры
const MIN_EAT_RADIUS_DIFFERENCE = 1.2; // На сколько должен быть больше радиус для поглощения
const BASE_RADIUS = 50; // Стартовый радиус игрока

function generateBrightColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 60%)`;
}

// Генерация корма
function generateFood() {
  // Очищаем существующую еду перед генерацией
  food.length = 0;

  for (let i = 0; i < 50; i++) {
    food.push({
      x: Math.random() * MAP_SIZE,
      y: Math.random() * MAP_SIZE,
      radius: 5,
      color: generateBrightColor(), // Генерируем уникальный цвет для каждого элемента
    });
  }
}

// Функция возрождения игрока
function respawnPlayer(socketId) {
  players[socketId] = {
    x: Math.random() * MAP_SIZE,
    y: Math.random() * MAP_SIZE,
    radius: BASE_RADIUS,
    color: "#" + (((1 << 24) * Math.random()) | 0).toString(16),
    name: `Guest ${socketId.slice(0, 5)}`, // Пример никнейма, можно изменить на что-то другое
  };
}

// Функция проверки полного поглощения
function isFullyAbsorbed(smallerPlayer, largerPlayer) {
  // Расстояние между центрами игроков
  const centerDistance = Math.sqrt(
    (smallerPlayer.x - largerPlayer.x) ** 2 +
      (smallerPlayer.y - largerPlayer.y) ** 2
  );

  // Проверяем, полностью ли меньший игрок находится внутри большего
  return centerDistance + smallerPlayer.radius <= largerPlayer.radius;
}

// События WebSocket
io.on("connection", (socket) => {
  console.log(`Игрок подключился: ${socket.id}`);

  // Добавляем нового игрока
  respawnPlayer(socket.id);

  // Отправляем начальные данные
  socket.emit("init", { players, food });

  // Обработка движения игрока
  socket.on("move", (data) => {
    const player = players[socket.id];
    if (!player) return;

    // Перемещение игрока с проверкой границ карты
    player.x = Math.min(MAP_SIZE, Math.max(0, data.x));
    player.y = Math.min(MAP_SIZE, Math.max(0, data.y));

    let playerGrew = false;

    // Проверка столкновений с кормом
    food.forEach((f, index) => {
      const dist = Math.sqrt((player.x - f.x) ** 2 + (player.y - f.y) ** 2);
      if (dist < player.radius + f.radius) {
        player.radius += 1; // Увеличиваем радиус игрока
        food.splice(index, 1); // Удаляем корм
        playerGrew = true;
      }
    });

    // Проверка столкновений с другими игроками
    // Проверка столкновений с другими игроками
    Object.keys(players).forEach((id) => {
      if (id !== socket.id) {
        const other = players[id];

        // Проверка, может ли больший игрок поглотить меньшего
        if (
          player.radius >= other.radius * MIN_EAT_RADIUS_DIFFERENCE &&
          isFullyAbsorbed(other, player)
        ) {
          // Увеличиваем радиус текущего игрока на радиус поглощенного
          player.radius += other.radius / 2;

          // Удаляем поглощенного игрока
          delete players[id];
          socket.to(id).emit("player_eaten");

          // Отправляем обновленные данные всем игрокам
          io.emit("update", { players, food });
        }

        // Проверка, может ли меньший игрок поглотить большего
        if (
          other.radius >= player.radius * MIN_EAT_RADIUS_DIFFERENCE &&
          isFullyAbsorbed(player, other)
        ) {
          // Увеличиваем радиус большего игрока
          other.radius += player.radius / 2;

          // Удаляем поглощенного игрока
          delete players[socket.id]; // Удаляем текущего игрока
          socket.emit("player_eaten"); // Отправляем событие игроку

          // Отправляем обновленные данные всем игрокам
          io.emit("update", { players, food });
        }
      }
    });
    if (playerGrew) {
        io.emit("update", { players, food });
      }
  });

  // Обработка возрождения игрока
  socket.on("respawn", () => {
    respawnPlayer(socket.id);
    socket.emit("init", { players, food });
  });

  // Обработка отключения игрока
  socket.on("disconnect", () => {
    console.log(`Игрок отключился: ${socket.id}`);
    delete players[socket.id];
  });
});

// Рассылка данных всем игрокам
setInterval(() => {
  io.emit("update", { players, food });

  // Генерация нового корма
  if (food.length < 150) {
    food.push({
      x: Math.random() * MAP_SIZE,
      y: Math.random() * MAP_SIZE,
      radius: 5,
      color: generateBrightColor(),
    });
  }
}, 1000 / 30); // 30 FPS

// Отдача статических файлов
app.use(express.static("public"));

// Запуск сервера
server.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});

// Генерация начального корма
generateFood();

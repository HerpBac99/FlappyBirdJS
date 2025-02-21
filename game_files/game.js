var PlayersManager    = require('./playersManager'),
    PipeManager       = require('./pipeManager'),
    CollisionEngine   = require('./collisionEngine'),
    enums             = require('./enums'),
    Const             = require('../sharedConstants').constant,
    https             = require('https'),
    fs                = require('fs');

var _playersManager,
    _pipeManager,
    io,
    _gameState,
    _timeStartGame,
    _lastTime = null,
    _timer = null;


function playerLog(socket, player, nick) {
  // Bind new client events
  socket.on('change_ready_state', function (readyState) {
    // If the server is currently waiting for players, update ready state
    if (_gameState == enums.ServerState.WaitingForPlayers) {
      _playersManager.changeLobbyState(player, readyState);
      socket.broadcast.emit('player_ready_state', player.getPlayerObject());
    }
  });

  socket.on('player_jump', function () {
    if (_gameState == enums.ServerState.OnGame) {
      player.jump();
    }
  });

  // Set player's nickname and prepare him for the next game
  _playersManager.prepareNewPlayer(player, nick);

  // Notify new client about other players AND notify other about the new one
  socket.emit('player_list', _playersManager.getPlayerList());
  socket.broadcast.emit('new_player', player.getPlayerObject());
}

function updateGameState (newState, notifyClients) {
  var log = '\t[SERVER] Game state changed ! Server is now ';
  
  _gameState = newState;
  switch (_gameState) {
    case enums.ServerState.WaitingForPlayers:
      log += 'in lobby waiting for players'
      break;
    case enums.ServerState.OnGame:
      log += 'in game !'
      break;
    case enums.ServerState.Ranking:
      log += 'displaying ranking'
      break;
    default:
      log += 'dead :p'
  }
  console.info(log);

  // If requested, inform clients qbout the chsnge
  if (notifyClients)
    io.sockets.emit('update_game_state', _gameState);
}

function resetGame() {
  // Останавливаем игровой цикл
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
  
  // Сбрасываем временные метки
  _lastTime = null;
  _timeStartGame = null;

  // Очищаем список труб
  _pipeManager.flushPipeList();

  // Сбрасываем состояние игроков и получаем обновленный список
  var players = _playersManager.resetPlayersForNewGame();
  
  // Отправляем обновленное состояние каждого игрока
  players.forEach(function(player) {
    io.sockets.emit('player_ready_state', player);
  });

  // Сбрасываем состояние игры
  _gameState = enums.ServerState.WaitingForPlayers;
  
  // Уведомляем всех клиентов о сбросе состояния
  io.sockets.emit('game_reset');
}

function gameOver() {
  // Меняем состояние сервера
  updateGameState(enums.ServerState.Ranking, true);

  // Отправляем счет игроков
  _playersManager.sendPlayerScore();

  // После 5с создаем новую игру
  setTimeout(function() {
    resetGame();
    createNewGame();
  }, Const.TIME_BETWEEN_GAMES);
}

function createNewGame() {
  // Устанавливаем начальное состояние
  _gameState = enums.ServerState.WaitingForPlayers;
  
  // Создаем первую трубу
  _pipeManager.newPipe();

  // Уведомляем игроков о новом состоянии игры
  updateGameState(_gameState, true);
}

function startGameLoop() {
  // Меняем состояние сервера
  updateGameState(enums.ServerState.OnGame, true);

  // Создаем первую трубу
  _pipeManager.newPipe();

  // Запускаем таймер
  _timer = setInterval(function() {
    var now = new Date().getTime(),
        ellapsedTime = 0;

    // Получаем разницу во времени между последним вызовом и текущим
    if (_lastTime) {
      ellapsedTime = now - _lastTime;
    } else {
      _timeStartGame = now;
    }

    _lastTime = now;
    
    // Если все игроки вышли, завершаем игру
    if (_playersManager.getNumberOfPlayers() == 0) {
      gameOver();
      return;
    }

    // Обновляем позиции игроков
    _playersManager.updatePlayers(ellapsedTime);

    // Обновляем трубы
    _pipeManager.updatePipes(ellapsedTime);

    // Проверяем столкновения
    if (CollisionEngine.checkCollision(_pipeManager.getPotentialPipeHit(), _playersManager.getPlayerList(enums.PlayerState.Playing)) == true) {
      if (_playersManager.arePlayersStillAlive() == false) {
        gameOver();
        return;
      }
    }

    // Уведомляем игроков
    io.sockets.emit('game_loop_update', { 
      players: _playersManager.getOnGamePlayerList(), 
      pipes: _pipeManager.getPipeList()
    });

  }, 1000 / 60);
}

exports.startServer = function (server) {
  io = require('socket.io')(server, {
    cors: {
      origin: ["https://flappy.keenetic.link/", "https://flappy.keenetic.link", "https://127.0.0.1", "https://localhost"],
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept"]
    },
    transports: ['polling', 'websocket']
  });
  
  _gameState = enums.ServerState.WaitingForPlayers;
  
  // Create playersManager instance and register events
  _playersManager = new PlayersManager();
  _playersManager.on('players-ready', function () {
    startGameLoop();
  });

  // Create pipe manager and bind event
  _pipeManager = new PipeManager();
  _pipeManager.on('need_new_pipe', function () {
    var pipe = _pipeManager.newPipe();
  });

  // On new client connection
  io.sockets.on('connection', function (socket) {
    console.log('New client connected');
    
    socket.on('say_hi', function (nick, fn) {
      var player = _playersManager.addNewPlayer(socket, socket.id);
      socket.data.player = player;
      
      console.log('Player initialized:', nick);
      fn(_gameState, player.getID());
      playerLog(socket, player, nick);
    });

    // Добавляем обработку отключения
    socket.on('disconnect', function() {
      const player = socket.data.player;
      if (player) {
        _playersManager.removePlayer(player);
        socket.broadcast.emit('player_disconnect', player.getPlayerObject());
      }
    });

    socket.on('quit_game', function() {
      const player = socket.data.player;
      if (player) {
        _playersManager.removePlayer(player);
        socket.broadcast.emit('player_disconnect', player.getPlayerObject());
      }
    });

    socket.on('restart_game', function() {
      // Немедленно создаем новую игру
      createNewGame();
    });
  });
  

  console.log('Game WebSocket server initialized on port ' + Const.SERVER_PORT);
};

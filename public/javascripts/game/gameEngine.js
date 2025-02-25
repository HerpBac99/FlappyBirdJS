/*
*   Game Engine
*/
define(['canvasPainter', 'playersManager', '../../sharedConstants'], function (canvasPainter, PlayersManager, Const) {
  console.log('GameEngine module loaded');

  const DEBUG = true;

  function log(...args) {
    if (DEBUG) {
      console.log('[GameEngine]', ...args);
    }
  }

  var enumState = {
    Login: 0,
    WaitingRoom: 1,
    OnGame: 2,
    Ranking: 3
  };

  var enumPanels = {
    Login: 'gs-login',
    Ranking: 'gs-ranking',
    HighScores: 'gs-highscores',
    Error: 'gs-error'
  };

  var _gameState = enumState.Login,
      _playerManager,
      _pipeList,
      _isCurrentPlayerReady = false,
      _userID = null,
      _lastTime = null,
      _rankingTimer,
      _ranking_time,
      _isTouchDevice = false,
      _socket,
      _infPanlTimer,
      _isNight = false;

  // Добавим поддержку Telegram WebApp
  const tg = window.Telegram.WebApp;
  
  // Настроим размер окна
  function resizeGame() {
    const gameScreen = document.getElementById('gameScreen');
    const canvas = document.getElementById('gs-canvas');
    
    // Получаем размеры из Telegram WebApp
    const viewportHeight = tg.viewportHeight || window.innerHeight;
    const viewportWidth = tg.viewportStableWidth || window.innerWidth;
    
    // Вычисляем оптимальный масштаб
    const scaleX = viewportWidth / Const.SCREEN_WIDTH;
    const scaleY = viewportHeight / Const.SCREEN_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    
    // Применяем масштаб к игровому экрану
    const scaledWidth = Math.floor(Const.SCREEN_WIDTH * scale);
    const scaledHeight = Math.floor(Const.SCREEN_HEIGHT * scale);
    
    // Центрируем игру
    const leftOffset = Math.floor((viewportWidth - scaledWidth) / 2);
    const topOffset = Math.floor((viewportHeight - scaledHeight) / 2);
    
    // Применяем стили
    gameScreen.style.width = `${scaledWidth}px`;
    gameScreen.style.height = `${scaledHeight}px`;
    gameScreen.style.left = `${leftOffset}px`;
    gameScreen.style.top = `${topOffset}px`;
    
    // Масштабируем canvas
    canvas.style.width = `${scaledWidth}px`;
    canvas.style.height = `${scaledHeight}px`;
    
    // Сохраняем оригинальные размеры canvas для корректного рендеринга
    canvas.width = Const.SCREEN_WIDTH;
    canvas.height = Const.SCREEN_HEIGHT;
  }

  // Добавляем обработчики изменения размера
  window.addEventListener('resize', resizeGame);
  tg.onEvent('viewportChanged', resizeGame);
  resizeGame();

  // Используем имя пользователя из Telegram
  function getTelegramUsername() {
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
      const user = tg.initDataUnsafe.user;
      // Ограничиваем длину имени до 8 символов
      let username = user.username || `${user.first_name}`;
      if (username.length > 8) {
        username = username.substring(0, 8);
      }
      // Заменяем пробелы на подчеркивания
      username = username.replace(/\s+/g, '_');
      return username;
    }
    return 'Player_1';
  }

  // Отображаем имя пользователя
  function displayUsername() {
    const username = getTelegramUsername();
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
      userNameElement.textContent = `User: ${username}`;
    }
  }

  // Вызовите displayUsername после загрузки страницы
  window.addEventListener('load', displayUsername);

  function draw (currentTime, ellapsedTime) {

    // If player score is > 15, night !!
    if ((_gameState == enumState.OnGame) && (_playerManager.getCurrentPlayer().getScore() == 15))
      _isNight = true;

    canvasPainter.draw(currentTime, ellapsedTime, _playerManager, _pipeList, _gameState, _isNight);
  }

  requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;


  function gameLoop() {
    var now = new Date().getTime(),
        ellapsedTime = 0;

    // Call for next anim frame
    if (_gameState == enumState.OnGame)
      requestAnimationFrame(gameLoop);

    // Get time difference between the last call and now
    if (_lastTime) {
      ellapsedTime = now - _lastTime;
    }
    _lastTime = now;

    // Call draw with the ellapsed time between the last frame and the current one
    draw(now, ellapsedTime);
  }

  function lobbyLoop() {
    var now = new Date().getTime();

    // Call for next anim frame
    if (_gameState == enumState.WaitingRoom)
      requestAnimationFrame(lobbyLoop);

    // Call draw with the ellapsed time between the last frame and the current one
    draw(now, 0);
  }

  let _isClientStarted = false;

  function startClient() {
    if (_isClientStarted) {
      log('Клиент уже запущен, пропускаем повторный запуск');
      return;
    }
    _isClientStarted = true;

    log('1. Запуск игрового клиента');
    
    if (typeof io == 'undefined') {
      log('Ошибка: Socket.IO не найден');
      document.getElementById('gs-error-message').innerHTML = 'Cannot retrieve socket.io library';
      showHideMenu(enumPanels.Error, true);
      return;
    }

    log('2. Инициализация менеджера игроков');
    _playerManager = new PlayersManager();
    
    log('3. Подключение к серверу...');
    document.getElementById('gs-loader-text').innerHTML = 'Connecting to the server...';
    showHideMenu('gs-loader', true);

    _socket = io(Const.SOCKET_ADDR, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      secure: true,
      autoConnect: true
    });

    _socket.on('connect', function() {
      log('4. Соединение установлено');
      showHideMenu('gs-loader', false);
      
      const savedName = sessionStorage.getItem('playerName');
      log('5. Проверка сохраненного имени:', savedName);
      const loginForm = document.getElementById('gs-login');
      const playButton = document.getElementById('play-button');
      const playerNameInput = document.getElementById('player-name');
      
      // Всегда показываем кнопку Play
      playButton.classList.remove('hidden');
      
      if (savedName && savedName !== 'Player_1') {
        // Если знаем имя - просто сохраняем его
        playerNameInput.value = savedName;
        loginForm.classList.add('hidden');
      } else {
        // Если не знаем имя - показываем форму ввода
        const telegramName = getTelegramUsername();
        if (telegramName && telegramName !== 'Player_1') {
          playerNameInput.value = telegramName;
          loginForm.classList.add('hidden');
        } else {
          loginForm.classList.remove('hidden');
        }
      }
      
      // Обработчик для кнопки Play
      document.getElementById('play-game').onclick = function() {
        const currentName = playerNameInput.value;
        
        if (currentName && currentName !== 'Player_1') {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('playerName', currentName);
          }
          
          console.log('Send nickname:', currentName);
          _socket.emit('say_hi', currentName, function(serverState, uuid) {
            _userID = uuid;
            changeGameState(serverState);
            
            // Настраиваем управление
            setupControls();
            
            // Скрываем все меню
            loginForm.classList.add('hidden');
            playButton.classList.add('hidden');
          });
        } else {
          infoPanel(true, 'Please enter your <strong>name</strong> !', 2000);
          loginForm.classList.remove('hidden');
          playerNameInput.focus();
        }
      };
      
      draw(0, 0);
    });

    _socket.on('connect_error', function(error) {
      console.error('Connection Error:', error);
      document.getElementById('gs-error-message').innerHTML = 'Failed to connect to game server. Please try again.';
      showHideMenu(enumPanels.Error, true);
    });

    // Добавляем обработчики событий
    _socket.on('player_list', function(playersList) {
      log('6. Получен список игроков:', playersList.length);
      playersList.forEach(function(player) {
        _playerManager.addPlayer(player, _userID);
      });
      draw(0, 0);
    });

    _socket.on('new_player', function(player) {
      _playerManager.addPlayer(player);
    });

    _socket.on('player_disconnect', function(player) {
      _playerManager.removePlayer(player);
    });

    _socket.on('player_ready_state', function(playerInfos) {
      const player = _playerManager.getPlayerFromId(playerInfos.id);
      if (player) {
        player.updateFromServer(playerInfos);
      }
    });

    _socket.on('game_loop_update', function(data) {
      _playerManager.updatePlayerListFromServer(data.players);
      _pipeList = data.pipes;
    });

    _socket.on('update_game_state', changeGameState);
    _socket.on('ranking', displayRanking);

    // Добавляем обработчик сброса игры
    _socket.on('game_reset', function() {
      _lastTime = null;
      _pipeList = null;
      _isCurrentPlayerReady = false;
      _isNight = false;
      
      if (_rankingTimer) {
        clearInterval(_rankingTimer);
        _rankingTimer = null;
      }
      
      if (_infPanlTimer) {
        clearTimeout(_infPanlTimer);
        _infPanlTimer = null;
      }

      canvasPainter.resetForNewGame();
    });
  }

  function setupControls() {
    if (_isTouchDevice) {
      document.addEventListener('touchstart', function(event) {
        event.preventDefault();
        inputsManager(event);
      }, { passive: false });
      infoPanel(true, '<strong>Tap</strong> to fly !', 3000);
    } else {
      document.addEventListener('keydown', function(event) {
        if (event.keyCode === 32) {
          event.preventDefault();
          inputsManager(event);
        }
      });
      infoPanel(true, 'Press <strong>space</strong> to fly !', 3000);
    }
  }

  function displayRanking(score) {
    // Показываем панель Game Over
    showHideMenu(enumPanels.Ranking, true);

    // Добавляем таймер обратного отсчета
    var timeLeft = 5;
    var restartBtn = document.getElementById('restart-game');
    var quitBtn = document.getElementById('quit-game');
    
    restartBtn.innerHTML = 'Restart (' + timeLeft + ')';
    
    var countdownTimer = setInterval(function() {
      timeLeft--;
      restartBtn.innerHTML = 'Restart (' + timeLeft + ')';
      
      if (timeLeft <= 0) {
        clearInterval(countdownTimer);
        // Автоматически перезапускаем игру если не было нажатий
        if (!quitClicked) {
          restartGame();
        }
      }
    }, 1000);

    var quitClicked = false;

    // Обработчик для кнопки рестарта - мгновенный рестарт
    restartBtn.onclick = function() {
      quitClicked = true; // Предотвращаем автоматический рестарт
      clearInterval(countdownTimer); // Останавливаем таймер
      restartGame(); // Сразу запускаем новую игру
    };

    // Обработчик для кнопки выхода
    quitBtn.onclick = function() {
      quitClicked = true;
      clearInterval(countdownTimer);
      quitToMenu();
    };

    function restartGame() {
      // Очищаем все таймеры
      if (_rankingTimer) {
        clearInterval(_rankingTimer);
        _rankingTimer = null;
      }
      if (_infPanlTimer) {
        clearTimeout(_infPanlTimer);
        _infPanlTimer = null;
      }
      _lastTime = null;

      // Скрываем все панели
      showHideMenu(enumPanels.Ranking, false);
      showHideMenu(enumPanels.HighScores, false);

      // Сбрасываем состояния
      _isCurrentPlayerReady = false;
      _pipeList = null;
      _isNight = false;
      
      // Сбрасываем графику
      canvasPainter.resetForNewGame();

      // Сообщаем серверу о рестарте
      _socket.emit('restart_game');
    }

    function quitToMenu() {
      showHideMenu(enumPanels.Ranking, false);
      showHideMenu(enumPanels.Login, true);
      // Отключаемся от текущей игры
      _socket.emit('quit_game');
      // Сбрасываем состояния
      _gameState = enumState.Login;
      _isCurrentPlayerReady = false;
      _pipeList = null;
      // Очищаем игроков
      _playerManager.clear();
      // Сбрасываем графику
      canvasPainter.resetForNewGame();
      _isNight = false;
      // Разблокируем кнопку Play
      document.getElementById('play-game').disabled = false;
    }
  }

  function changeGameState(gameState) {
    log('Смена состояния игры на:', gameState);
    _gameState = gameState;

    switch (_gameState) {
      case enumState.WaitingRoom:
        log('Переход в комнату ожидания');
        _isCurrentPlayerReady = false;
        lobbyLoop();
        break;

      case enumState.OnGame:
        log('Начало игры');
        _pipeList = null;
        gameLoop();
        break;

      case enumState.Ranking:
        log('Показ рейтинга');
        break;
    }
  }

  function inputsManager(event) {
    if (!_playerManager || !_playerManager.getCurrentPlayer()) return;

    if (_gameState == enumState.WaitingRoom) {
      _isCurrentPlayerReady = !_isCurrentPlayerReady;
      _playerManager.getCurrentPlayer().updateReadyState(_isCurrentPlayerReady);
      _socket.emit('change_ready_state', _isCurrentPlayerReady);
    }
    else if (_gameState == enumState.OnGame) {
      _socket.emit('player_jump');
    }
  }

  function showHideMenu(panelName, isShow) {
    var panel = document.getElementById(panelName);
    
    if (!panel) return;

    if (isShow) {
      panel.classList.remove('hidden');
      panel.classList.add('overlay');
    } else {
      panel.classList.add('hidden');
      panel.classList.remove('overlay');
    }
  }
  
  function infoPanel (isShow, htmlText, timeout) {
    var topBar   = document.getElementById('gs-info-panel');

    // Reset timer if there is one pending
    if (_infPanlTimer != null) {
      window.clearTimeout(_infPanlTimer);
      _infPanlTimer = null;
    }

    // Hide the bar
    if (isShow == false) {
      topBar.classList.remove('showTopBar');
    }
    else {
      // If a set is setted, print it
      if (htmlText)
        topBar.innerHTML = htmlText;
      // If a timeout is specified, close the bar after this time !
      if (timeout)
        _infPanlTimer = setTimeout(function() {
          infoPanel(false);
        }, timeout);

      // Don't forget to display the bar :)
      topBar.classList.add('showTopBar');
    }
  }

  // Detect touch event. If available, we will use touch events instead of space key
  if (window.navigator.msPointerEnabled)
    _isTouchDevice = true;
  else if ('ontouchstart' in window)
    _isTouchDevice = true;
  else
    _isTouchDevice = false;
  
  // Load ressources and Start the client !
  console.log('Client started, load ressources...');
  canvasPainter.loadRessources(function () {
    console.log('Ressources loaded, connect to server...');
    startClient();
  });

});
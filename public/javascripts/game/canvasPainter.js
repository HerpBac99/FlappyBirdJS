/*
*   Class to manage the canvas. Draw players, backgrounds, etc...  
*/
define(['parallax', 'backgroundRessources', '../../sharedConstants'], function (Parallax, BgRessources, Const) {

  // Sprite ressource dimensions
  var SPRITE_PIPE_HEIGHT  = 768;
  var SPRITE_PIPE_WIDTH   = 148;

  // Const to display score in game
  var SCORE_POS_Y         = 200;
  var SCORE_SHADOW_OFFSET = 5;

  // Ressources
  var NB_RESSOURCES_TO_LOAD   = 2;

  // Birds sprites
  var BIRDS_SPRITES = [
    'images/clumsy.png',
    'images/clumsy-blue.png',
    'images/clumsy-red.png',
    'images/clumsy-multi.png'
  ];

  var that = {},
      ctx = document.getElementById('gs-canvas').getContext('2d'),
      _isReadyToDraw = false,

      // Ressources
      _nbRessourcesToLoad = getNbRessourcesToLoad(),
      _picGround,
      _parallaxGround,
      _picPipe,
      _picBG = new Array();
      _picBirds = new Array();


  function getNbRessourcesToLoad () {
    var nbRessources = NB_RESSOURCES_TO_LOAD + BIRDS_SPRITES.length,
        nbBg = BgRessources.length,
        i;

    // Search number of BG ressources
    for (i = 0; i < nbBg; i++) {
      if (typeof BgRessources[i].daySrc !== 'undefined')
        nbRessources++;
      if (typeof BgRessources[i].nightSrc !== 'undefined')
        nbRessources++;
    };

    return (nbRessources);
  }

  function drawPipe (pipe) {
    // ---- ПОДРОБНОЕ ОБЪЯСНЕНИЕ ОТРИСОВКИ ТРУБ ----
    // 
    // Проблема была в том, что трубы отрисовывались с красными прямоугольниками по бокам.
    // Причина в том, что при отрисовке использовался весь спрайт, включая прозрачные области,
    // которые заполнялись красным цветом из-за особенностей отрисовки.
    //
    // Для исправления:
    // 1. Изменяем размеры вырезаемой области изображения, чтобы исключить прозрачные части
    // 2. Устанавливаем правильные пропорции отрисовки

    // Обновленные размеры для вырезания центральной части спрайта без прозрачных областей
    var srcX = 30;  // Начальная X-координата в спрайте (пропускаем прозрачные пиксели)
    var srcWidth = SPRITE_PIPE_WIDTH - 60;  // Используем только непрозрачную часть спрайта

    // Отрисовка верхней трубы (перевёрнутой)
    ctx.save(); // Сохраняем текущее состояние контекста
    ctx.translate(pipe.posX + Const.PIPE_WIDTH/2, pipe.posY - SPRITE_PIPE_HEIGHT/2); // Перемещаем к центру трубы
    ctx.rotate(Math.PI); // Поворачиваем на 180 градусов

    // Рисуем только центральную часть спрайта без прозрачных краев
    ctx.drawImage(
        _picPipe,                    // Изображение трубы
        srcX, 0,                     // Начинаем с отступом слева, чтобы исключить прозрачную часть
        srcWidth, SPRITE_PIPE_HEIGHT, // Берем только непрозрачную часть по ширине
        -Const.PIPE_WIDTH/2, -SPRITE_PIPE_HEIGHT/2, // Координаты для отрисовки
        Const.PIPE_WIDTH, SPRITE_PIPE_HEIGHT   // Размеры трубы при отрисовке
    );
    ctx.restore(); // Восстанавливаем состояние контекста

    // Отрисовка нижней трубы
    ctx.drawImage(
        _picPipe,                    // Изображение трубы
        srcX, 0,                     // Начинаем с отступом слева, чтобы исключить прозрачную часть
        srcWidth, SPRITE_PIPE_HEIGHT, // Берем только непрозрачную часть по ширине
        pipe.posX, pipe.posY + Const.HEIGHT_BETWEEN_PIPES, // Координаты для отрисовки нижней трубы
        Const.PIPE_WIDTH, SPRITE_PIPE_HEIGHT   // Размеры трубы при отрисовке
    );
  };

  function drawScore (score) {
    var posX;

    posX = (Const.SCREEN_WIDTH / 2) - (ctx.measureText(score).width / 2);
    ctx.font = '120px mini_pixel';
    ctx.fillStyle = 'black';
    ctx.fillText(score, posX + SCORE_SHADOW_OFFSET, SCORE_POS_Y + SCORE_SHADOW_OFFSET);
    ctx.fillStyle = 'white';
    ctx.fillText(score, posX, SCORE_POS_Y);
  };

  that.draw = function (currentTime, ellapsedTime, playerManager, pipes, gameState, isNight) {
    var nb,
        i,
        players = playerManager.getPlayers();

    if (!_isReadyToDraw) {
      console.log('[ERROR] : Ressources not yet loaded !');
      return;
    }

    // Очищаем весь канвас голубым цветом (небо)
    ctx.fillStyle = '#0099CC';
    ctx.fillRect(0, 0, Const.SCREEN_WIDTH, Const.SCREEN_HEIGHT);
    
    // Отрисовываем фоновые изображения (облака, город, деревья)
    nb = _picBG.length;
    for (i = 0; i < nb; i++) {
      _picBG[i].draw(ctx, ellapsedTime, isNight);
    };

    // Отрисовываем землю (важно отрисовать перед трубами)
    if (pipes)
      _parallaxGround.draw(ctx, currentTime);
    else
      _parallaxGround.draw(ctx, 0);

    // Устанавливаем область отрисовки только в пределах игрового поля
    // Это предотвратит отрисовку труб за пределами игрового экрана
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, Const.SCREEN_WIDTH, Const.SCREEN_HEIGHT);
    ctx.clip();

    // Отрисовываем трубы только в пределах игрового поля
    if (pipes) {
      nb = pipes.length;
      for (i = 0; i < nb; i++) {
        // Проверяем, находится ли труба в пределах видимой области экрана
        if (pipes[i].posX + Const.PIPE_WIDTH > 0 && pipes[i].posX < Const.SCREEN_WIDTH) {
          drawPipe(pipes[i]);
        }
      };
    }

    // Отрисовываем птиц
    if (players) {
      nb = players.length;
      for (i = 0; i < nb; i++) {
        players[i].draw(ctx, currentTime, _picBirds, gameState);
      };
    }

    ctx.restore();

    // Отрисовываем счет
    if (gameState == 2)
      drawScore(playerManager.getCurrentPlayer().getScore());
  };

    that.resetForNewGame = function () {
    var nb = _picBG.length,
        i;
    // Reset state of backgrounds pictures
    for (i = 0; i < nb; i++) {
      _picBG[i].resetToDayCycle();
    };
  };

  that.loadRessources = function (onReadyCallback) {
    var bird,
        dBg,
        nBg,
        i;

    // Load ground
    _picGround = new Image();
    _picGround.src = 'images/ground.png';
    _picGround.onload = function() { onRessourceLoaded(onReadyCallback); };
    _parallaxGround = new Parallax(_picGround, null, 900, 96, Const.LEVEL_SPEED, 672, Const.SCREEN_WIDTH);

    // Load pipe
    _picPipe = new Image();
    _picPipe.src = 'images/pipe-up.png';
    _picPipe.onload = function() { onRessourceLoaded(onReadyCallback); };    

    // Load birds sprites
    for (i = 0; i < BIRDS_SPRITES.length; i++) {
      bird = new Image();
      bird.src = BIRDS_SPRITES[i];
      bird.onload = function() { onRessourceLoaded(onReadyCallback); };
      // Add bird sprite in our array
      _picBirds.push(bird);
    };

    // Load Backgrounds
    // Be carefull, the position in the array matters. First add, first draw !
    for (i = 0; i < BgRessources.length; i++) {

      // If a day ressource exists for thi BG, load it
      if (typeof BgRessources[i].daySrc !== 'undefined') {
        dBg = new Image();
        dBg.src = BgRessources[i].daySrc;
        dBg.onload = function() { onRessourceLoaded(onReadyCallback); };
      }
      else
        dBg = null;

      // The same for night version of this bg...
      if (typeof BgRessources[i].nightSrc !== 'undefined') {
        nBg = new Image();
        nBg.src = BgRessources[i].nightSrc;
        nBg.onload = function() { onRessourceLoaded(onReadyCallback); };
      }
      else
        nBg = null;

      // Create a parallax obj with this ressource and add it in the bg array
      _picBG.push(new Parallax(dBg, nBg, BgRessources[i].width, BgRessources[i].height, BgRessources[i].speed, BgRessources[i].posY, Const.SCREEN_WIDTH));
    };


    function onRessourceLoaded (onReadyCallback) {
      var totalRessources = getNbRessourcesToLoad();
      
      if (--_nbRessourcesToLoad <= 0) {
        _isReadyToDraw = true;
        onReadyCallback();
      }
      else {
        document.getElementById('gs-loader-text').innerHTML = ('Load ressource ' + (totalRessources - _nbRessourcesToLoad) + ' / ' + totalRessources);
      }
    };

  };

  return (that);
});
var util          = require('util'),
    EventEmitter  = require('events').EventEmitter,
    Pipe          = require('./pipe'),
    enums         = require('./enums'),
    Const         = require('../sharedConstants').constant;

var FIRST_PIPE_POSX           = Const.SCREEN_WIDTH + 100;
var SPAWN_PIPE_ALERT          = Const.SCREEN_WIDTH;
var MAX_PIPE_CHECK_COLLISION  = 3;

var _pipeList = new Array(),
    _socket = null;

function PipeManager () {
  EventEmitter.call(this);
};

util.inherits(PipeManager, EventEmitter);

PipeManager.prototype.setSocket = function (socket) {
  _socket = socket;
};

PipeManager.prototype.newPipe = function () {
  var newPipe,
      lastPos = FIRST_PIPE_POSX;

  if (_pipeList.length > 0)
    lastPos = _pipeList[_pipeList.length - 1].getPipeObject().posX;

  newPipe = new Pipe(lastPos);
  _pipeList.push(newPipe);

  return (newPipe);
};

PipeManager.prototype.updatePipes = function (ellapsedTime) {
  // Проверяем, есть ли трубы в массиве
  if (_pipeList.length > 0) {
    // Если первая труба может быть удалена
    if (_pipeList[0].canBeDroped()) {
      _pipeList.shift();
      // Создаем новую трубу только если их меньше максимального количества
      if (_pipeList.length < 3) {
        this.emit('need_new_pipe');
      }
    }
    
    // Обновляем позиции всех труб
    _pipeList.forEach(function(pipe) {
      pipe.update(ellapsedTime);
    });

    // Проверяем, нужно ли создать новую трубу
    if (_pipeList.length > 0) {
      var lastPipe = _pipeList[_pipeList.length - 1];
      if (lastPipe.getPipeObject().posX < SPAWN_PIPE_ALERT) {
        this.emit('need_new_pipe');
      }
    }
  } else {
    // Если массив пуст, создаем новую трубу
    this.emit('need_new_pipe');
  }
};

PipeManager.prototype.getPipeList = function () {
  var pipes = new Array(),
      nbPipes = _pipeList.length,
      i;

  for (i = 0; i < nbPipes; i++) {
      pipes.push(_pipeList[i].getPipeObject());
  };

  return (pipes);
};

PipeManager.prototype.getPotentialPipeHit = function () {
  var pipes = new Array(),
      nbPipes = _pipeList.length,
      i;

  // In multiplayer mode, just check the first 2 pipes
  // because the other ones are too far from the players
  if (nbPipes > MAX_PIPE_CHECK_COLLISION)
    nbPipes = MAX_PIPE_CHECK_COLLISION;

  for (i = 0; i < nbPipes; i++) {
    pipes.push(_pipeList[i].getPipeObject());
  };

  return (pipes);
};

PipeManager.prototype.flushPipeList = function () {
  _pipeList = [];
  // Создаем новую трубу только при явном запросе
  // this.emit('need_new_pipe');
};

PipeManager.prototype.reset = function() {
  _pipeList = [];
  this.newPipe(); // Создаем первую трубу с начальными параметрами
};

module.exports = PipeManager;
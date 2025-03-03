// Define all constants usefull by the server and the client
var constant = {

  SERVER_PORT: 443,
  SOCKET_PORT: 8080,
  SOCKET_ADDR: 'https://flappy.keenetic.link/',

  // Базовые размеры для расчета пропорций
  BASE_WIDTH: 500,
  BASE_HEIGHT: 700,
  
  // Динамические размеры (будут установлены в runtime)
  SCREEN_WIDTH: typeof window !== 'undefined' ? 
    Math.min(window.innerWidth, 500) : 500,
  SCREEN_HEIGHT: typeof window !== 'undefined' ? 
    Math.min(window.innerHeight, 700) : 700,

  FLOOR_POS_Y: 700,
  LEVEL_SPEED:              0.3,
  TIME_BETWEEN_GAMES:       5000,

  BIRD_START_X: 75,
  BIRD_START_Y: 350,
  BIRD_WIDTH: 42,
  BIRD_HEIGHT: 30,

  // Pipe constants
  PIPE_WIDTH:               100,
  DISTANCE_BETWEEN_PIPES:   250,
  MIN_PIPE_HEIGHT:          160,
  MAX_PIPE_HEIGHT:          430,
  HEIGHT_BETWEEN_PIPES:     150,

  GAME_SPEED: 4,           // Скорость игры
  PIPE_SPEED: 3,           // Скорость движения труб
  GRAVITY: 0.4,            // Гравитация
  FLAP_FORCE: -7          // Сила прыжка
};

// To be use by the server part, we have to provide the object with exports
if (typeof exports != 'undefined') {
  exports.constant = constant;
}
// Else provide the const object to require.js with define()
else {
  define(constant);
}

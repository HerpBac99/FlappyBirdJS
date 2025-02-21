/**
 * Module dependencies.
 */
var express = require('express'),
	routes 	= require('./routes'),
	https 	= require('https'),
	path 	= require('path'),
	Const   = require('./sharedConstants').constant,
	
	game 	= require('./game_files/game');

const crypto = require('crypto');

var app = express();

const fs = require("fs"); // Добавляем импорт модуля fs

const options = {
	key: fs.readFileSync("./ssl/server.key"), // Путь к приватному ключу
	cert: fs.readFileSync("./ssl/server.crt"), // Путь к сертификату
  };

// Единый CORS middleware
app.use(function(req, res, next) {
  const origin = "https://flappy.keenetic.link/";
  
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Credentials", "true");
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Настройка статических файлов
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: function (res, path, stat) {
    res.header("Access-Control-Allow-Origin", "https://flappy.keenetic.link/");
    res.header("Access-Control-Allow-Credentials", "true");
  }
}));

// all environments
app.set('port', Const.SERVER_PORT);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

//app.get('/', routes.index);
//app.get('/birds', routes.birds);
app.get('/', routes.birds);

// Route to get shared const file
app.get('/sharedConstants.js', function(req, res) {
    res.sendfile('sharedConstants.js');
});

// Функция для проверки данных от Telegram WebApp
function validateTelegramWebAppData(initData) {
  const encoded = decodeURIComponent(initData);
  const searchParams = new URLSearchParams(encoded);
  const hash = searchParams.get('hash');
  searchParams.delete('hash');

  // Отсортируем параметры
  const params = Array.from(searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  // Создаем HMAC с токеном бота
  const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN);
  const calculatedHash = crypto.createHmac('sha256', secret.digest())
    .update(params)
    .digest('hex');

  return calculatedHash === hash;
}

// Добавим middleware для проверки Telegram WebApp
app.use(function(req, res, next) {
  // Проверяем только для основного маршрута
  if (req.path === '/') {
    const initData = req.query.tgWebAppData;
    if (initData) {
      if (!validateTelegramWebAppData(initData)) {
        return res.status(401).send('Unauthorized');
      }
    }
  }
  next();
});

// Создаем HTTPS сервер
const server = https.createServer(options, app);

// Запускаем сервер
server.listen(Const.SERVER_PORT, function(){
  console.log('HTTPS Server running on port ' + Const.SERVER_PORT);
  // Запускаем игровой сервер
  game.startServer(server);
});
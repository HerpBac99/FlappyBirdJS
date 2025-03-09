/**
 * Module dependencies.
 */
var express = require('express'),
	routes 	= require('./routes'),
	https 	= require('https'),
	path 	= require('path'),
	Const   = require('./sharedConstants').constant,
	game 	= require('./game_files/game'),
	app = express();

const fs = require("fs"); // Добавляем импорт модуля fs

const options = {
	key: fs.readFileSync("./ssl/server.key"), // Путь к приватному ключу
	cert: fs.readFileSync("./ssl/server.crt"), // Путь к сертификату
  };

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
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.birds);


// Route to get shared const file
app.get('/sharedConstants.js', function(req, res) {
    res.sendfile('sharedConstants.js');
});

const server = https.createServer(options, app);

server.listen(Const.SERVER_PORT, function(){
	console.log('1. HTTPS Сервер запущен на порту', Const.SERVER_PORT);
	console.log('2. Инициализация игрового сервера...');
	game.startServer(server);
});
/**
 * Module dependencies.
 */
var express = require('express'),
	routes 	= require('./routes'),
	https 	= require('https'),
	path 	= require('path'),
	Const   = require('./sharedConstants').constant,
	
	game 	= require('./game_files/game');

var app = express();

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

//app.get('/', routes.index);
//app.get('/birds', routes.birds);
app.get('/', routes.birds);

// Route to get shared const file
app.get('/sharedConstants.js', function(req, res) {
    res.sendfile('sharedConstants.js');
});

https.createServer(options, app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

game.startServer();
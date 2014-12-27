/*jshint node:true, strict:true */
'use strict';

var express = require('express');
var morgan = require('morgan');
var compression = require('compression');
var responseTime = require('response-time');
var bodyParser = require('body-parser');
var errorhandler = require('errorhandler');
var ip = require('ip');

var DeviceManager = require('../../').DeviceManager;
var RemoteMediaPlayer = require('../../').RemoteMediaPlayer;

var path = require('path');
var fs = require('fs');
var util = require('util');

// EXPRESS CONFIGURATION
var app = express();
app.set('port', process.env.PORT || 3333);
app.use(compression());
app.use(responseTime());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
if (app.settings.env === 'development') {
  app.use(errorhandler());
}

app.listen(app.get('port'), function () {
  console.log("✔ Express server listening on port %d in %s mode", app.get('port'), app.settings.env);
});

// FLINT APP LAUNCH AND MEDIA LOAD
var appID = '~flintplayer';
var appURL = 'http://openflint.github.io/flint-player/player.html';

var device = {
  applicationUrl: 'http://localhost:9431/apps',
  name: 'MatchStick_MAC_a474',
  model: 'MatchStick'
};
var manager = manager = new DeviceManager(device);
manager.appID = appID;

function sendLoad(player) {
  // pick a file at random
  var files = fs.readdirSync(path.join(__dirname, 'public/media')).filter(function (e) {
    return player.likelySupportsDisplay(e);
  });
  var filepath = files[Math.floor(Math.random() * files.length)];
  if (filepath === undefined) {
    console.error('ERROR - no media files in:', path.join(__dirname, 'public/media'));
    manager.quitApp();
    return;
  }

  var fileURL = util.format('http://%s:%d/media/%s', ip.address(), app.get('port'), filepath);
  player.load(fileURL, function (err) {
    if (err) {
      console.error('ERROR - failed to send load:', err);
      return;
    }
  });
}

manager.on('error', function (err) {
  console.error('ERROR - DeviceManager failure:', err);
  process.exit(1);
});
manager.on('quit', function () {
  console.log('app quit');
  process.exit(0);
});
manager.on('channel', function (channel) {
  var player = new RemoteMediaPlayer(channel);
  player.on('message', function (data) {
    console.log('received player message:', util.inspect(data, {depth: 5}));

    var status = data.payload.status[0];
    if (status.playerState === 'IDLE' && status.idleReason === 'FINISHED') {
      setTimeout(function () {
        sendLoad(player);
      }, 1500);
    }
  });

  channel.on('open', function () {
    sendLoad(player);
  });
  channel.on('close', function () {
    console.log('channel closed, will quit app');
    manager.quitApp();
  });
  channel.on('error', function (err) {
    console.error('ERROR - MessageChannel failure:', err);
  });
});

manager.launchApp(appURL, {messageChannel: true});

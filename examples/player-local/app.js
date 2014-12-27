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

// see: http://www.matchstick.tv/developers/documents/supported-media.html
var RE = new RegExp(/mp4|m4v|webm|mkv$/i);
var TYPES = {
  mp4: 'video/mp4',
  m4v: 'video/x-m4v',
  webm: 'video/webm',
  mkv: 'video/x-matroska'
};
function contentTypeForFilepath(filepath) {
  var fileExtension = filepath.toLowerCase().match(RE)[0];
  return TYPES[fileExtension];
}

function sendLoad(channel) {
  // pick a video at random
  var files = fs.readdirSync(path.join(__dirname, 'public/videos')).filter(function (e) {
    return e.match(RE) !== null;
  });
  var filepath = files[Math.floor(Math.random() * files.length)];
  if (filepath === undefined) {
    console.error('ERROR - no video files in:', path.join(__dirname, 'public/videos'));
    manager.quitApp();
    return;
  }

  var fileURL = util.format('http://%s:%d/videos/%s', ip.address(), app.get('port'), filepath);
  var fileContentType = contentTypeForFilepath(filepath);
  var data = JSON.stringify({
    namespace: 'urn:flint:org.openflint.fling.media',
    payload: JSON.stringify({
      type: 'LOAD',
      requestId: 'requestId-2',
      media: {
        contentId: fileURL,
        contentType: fileContentType,
        metadata: {
          title: '',
          subtitle: ''
        }
      }
    })
  });
  channel.send(data, function (err) {
    if (err) {
      console.error('ERROR - failed to load media:', err);
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
  channel.on('open', function () {
    sendLoad(channel);
  });
  channel.on('close', function () {
    console.log('channel closed, will quit app');
    manager.quitApp();
  });
  channel.on('error', function (err) {
    console.error('ERROR - MessageChannel failure:', err);
  });
  channel.on('message', function (data) {
    data = JSON.parse(data);
    data.payload = JSON.parse(data.payload);

    // play another video when the current one finishes
    if (data.payload && data.payload.type === 'MEDIA_STATUS') {
      var status = data.payload.status[0];
      if (status.playerState === 'IDLE' && status.idleReason === 'FINISHED') {
        setTimeout(function () {
          sendLoad(channel);
        }, 1500);
      }
    }
  });
});

manager.launchApp(appURL, {messageChannel: true});

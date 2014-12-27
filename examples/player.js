/* jshint node:true */
'use strict';

// playback via the default flint player https://github.com/openflint/flint-player

var DeviceManager = require('../').DeviceManager;
var RemoteMediaPlayer = require('../').RemoteMediaPlayer;

var util = require('util');

var appID = '~flintplayer';
var appURL = 'http://openflint.github.io/flint-player/player.html';

var device = {
  applicationUrl: 'http://localhost:9431/apps',
  name: 'MatchStick_MAC_a474',
  model: 'MatchStick'
};
var manager = new DeviceManager(device);
manager.appID = appID;

manager.on('error', function (err) {
  console.error('ERROR - DeviceManager failure:', err);
  process.exit(1);
});
manager.on('channel', function (channel) {
  var player = new RemoteMediaPlayer(channel);
  player.on('message', function (data) {
    console.log('received player message:', util.inspect(data, {depth: 5}));
  });

  channel.on('open', function () {
   player.load('http://fling.matchstick.tv/droidream/samples/BigBuckBunny.mp4', function (err) {
      if (err) {
        console.error('ERROR - failed to load media:', err);
        return;
      }

      console.log('load message sent');
    });
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

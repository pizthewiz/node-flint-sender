/* jshint node:true */
'use strict';

// playback via the default flint player https://github.com/openflint/flint-player

var DeviceManager = require('../').DeviceManager;

var appID = '~flintplayer';
var appURL = 'http://openflint.github.io/flint-player/player.html';

var device = {
  applicationUrl: 'http://localhost:9431/apps',
  name: 'MatchStick_MAC_a474',
  model: 'MatchStick'
};
var manager = manager = new DeviceManager(device);
manager.appID = appID;

manager.on('error', function (err) {
  console.error('ERROR - DeviceManager failure:', err);
  process.exit(1);
});
manager.on('channel', function (channel) {
  channel.on('open', function () {
    // NB - weird double stringify for the default player message format
    var data = JSON.stringify({
      namespace: 'urn:flint:org.openflint.fling.media',
      payload: JSON.stringify({
        type: 'LOAD',
        requestId: 'requestId-2',
        media: {
          contentId: 'http://fling.matchstick.tv/droidream/samples/BigBuckBunny.mp4',
          contentType: 'video/mp4',
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
  channel.on('message', function (data) {
    // NB - weird double parse given the default player message format
    data = JSON.parse(data);
    data.payload = JSON.parse(data.payload);
    console.log('received message:', data);
  });
});

manager.launchApp(appURL, {messageChannel: true});

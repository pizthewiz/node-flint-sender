/* jshint node:true */
'use strict';

// based on the sender side of https://github.com/openflint/audio-visualizer-sample

var DeviceManager = require('../').DeviceManager;

var appID = '~audio-visualizer';
var appURL = 'http://openflint.github.io/audio-visualizer-sample/receiver_app/index.html';

var device = {
  applicationUrl: 'http://localhost:9431/apps',
  name: 'MatchStick_MAC_a474',
  model: 'MatchStick'
};
var manager = manager = new DeviceManager(device);
manager.appID = appID;

manager.on('launch', function () {
  // quit after 30 seconds
  setTimeout(function () {
    manager.quitApp();
  }, 30 * 1000);
});
manager.on('quit', function () {
  console.log('app quit');
  process.exit(0);
});
manager.on('error', function (err) {
  console.error('ERROR - DeviceManager failure:', err);
  process.exit(1);
});
manager.on('channel', function (channel) {
  channel.on('open', function () {
    console.log('channel opened');

    var data = JSON.stringify({
      'type': 'PLAY',
      'effect': 'wave',
      'url': 'http://openflint.github.io/audio-visualizer-sample/receiver_app/audio/EMDCR.ogg'
    });
    channel.send(data, function (err) {
      if (err) {
        console.error('ERROR - channel send failed:', err);
        return;
      }

      // success
    });
  });
  channel.on('close', function () {
    console.log('channel closed');
  });
  channel.on('error', function (err) {
    console.error('ERROR - MessageChannel failure:', err);
  });
  channel.on('message', function (data) {
    console.log('received message:', data);
  });
});

manager.launchApp(appURL, {messageChannel: true});

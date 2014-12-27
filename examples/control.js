/* jshint node:true */
'use strict';

var DeviceManager = require('../').DeviceManager;

var device = {
  applicationUrl: 'http://localhost:9431/apps',
  name: 'MatchStick_MAC_a474',
  model: 'MatchStick'
};
var manager = new DeviceManager(device);

manager.on('volume', function (value) {
  console.log('volume:', value);
});
manager.on('muted', function (value) {
  console.log('muted:', value);
});

manager.getVolume();
var value = Math.random();
manager.setVolume(value);
manager.setVolume(1.0);

manager.getMuted();
manager.setMuted(true);
manager.setMuted(false);

setTimeout(function () {
  process.exit(0);
}, 1 * 1000);

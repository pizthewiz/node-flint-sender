/* jshint node:true */
'use strict';

var DeviceScanner = require('../').DeviceScanner;
var DeviceManager = require('../').DeviceManager;

var appID = '~hello-world';
var appURL = 'http://openflint.github.io/hello-world-sample/index.html';

var manager = new DeviceManager();
manager.on('state', function (state) {
  console.log('state:', state);
});
manager.on('launch', function () {
  console.log('app launched');

  manager.getAppState();
  setInterval(function () {
    manager.getAppState();
  }, 1000);

  setTimeout(function () {
    manager.quitApp();
  }, 8000);
});
manager.on('quit', function () {
  console.log('app quit');
  process.exit(0);
});
manager.on('error', function (err) {
  console.error('ERROR - DeviceManager failure:', err);
  process.exit(1);
});

// find a device and then send it commands
var scanner = new DeviceScanner();
scanner.on('device', function (device) {
  console.log('found device:', device.name);

  scanner.stop();

  manager.device = device;
  manager.appID = appID;
  manager.launchApp(appURL);
});
scanner.start();

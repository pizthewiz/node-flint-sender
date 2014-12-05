/* jshint node:true */
'use strict';

var DeviceScanner = require('../').DeviceScanner;
var DeviceManager = require('../').DeviceManager;

var appID = '~hello-world';
var appURL = 'http://openflint.github.io/hello-world-sample/index.html';

var manager = null;

// find a device and then send it commands
var scanner = new DeviceScanner();
scanner.on('device', function (device) {
  console.log('found device:', device.name);
  scanner.stop();

  manager = new DeviceManager(device);
  sendCommands();
});
scanner.start();

function sendCommands() {
  // system control
  manager.systemControl('GET_MUTED', function (err, value) {
    console.log('muted:', value);
  });
  manager.systemControl('GET_VOLUME', function (err, value) {
    console.log('volume:', value);

    console.log('will set volume');
    manager.systemControl('SET_VOLUME', 0.333, function (err) {
      manager.systemControl('GET_VOLUME', function (err, value) {
        console.log('volume:', value);
      });
    });
  });

  // get app state
  manager.appID = appID;
  manager.getAppState(function (err, state) {
    console.log('app state:', state);

    // launch, state and close state
    console.log('will launch app');
    manager.launchApp(appURL, function (err) {
      console.log('app launched');

      manager.getAppState(function (err, state) {
        console.log('app state:', state);
      });

      setTimeout(function () {
        console.log('will close app');
        manager.closeApp(function (err) {
          console.log('app closed');

          manager.getAppState(function (err, state) {
            console.log('app state:', state);
          });
        });
      }, 3000);
    });
  });
}

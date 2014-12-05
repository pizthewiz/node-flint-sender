/* jshint node:true */
'use strict';

var DeviceManager = require('../').DeviceManager;

// synthesize a device
var device = {
  applicationUrl: 'http://localhost:9431/apps',
  location: 'http://localhost:9431/ssdp/device-desc.xml',
  name: 'MatchStick_MAC_b93d',
  model: 'MatchStick'
};

var manager = new DeviceManager(device);
manager.appURL = 'http://openflint.github.io/hello-world-sample/index.html';
manager.appID = '~hello-world';

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

// app launch, state and close
console.log('will launch app');
manager.launchApp(function (err) {
  if (err) {
    console.error('ERROR - failed to launch app - %s', err);
    return;
  }

  console.log('app launched');

  manager.getState(function (err, state) {
    if (err) {
      console.error('ERROR - failed to get state - %s', err);
      return;
    }

    console.log('app state:', state);
  });

  setTimeout(function () {
    console.log('will close app');
    manager.closeApp(function (err) {
      if (err) {
        console.error('ERROR - failed to close app - %s', err);
        return;
      }

      console.log('app closed');

      manager.getState(function (err, state) {
        if (err) {
          console.error('ERROR - failed to get state - %s', err);
          return;
        }

        console.log('app state:', state);
      });
    });
  }, 3000);
});

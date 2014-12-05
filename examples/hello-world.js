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
manager.appID = '~hello-world';
manager.getAppState(function (err, state) {
  console.log('app state:', state);

  // launch, state and close state
  console.log('will launch app');
  var appURL = 'http://openflint.github.io/hello-world-sample/index.html';
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

/* jshint node:true */
'use strict';

var Sender = require('../').Sender;

// synthesize a device
var device = {
  applicationUrl: 'http://localhost:9431/apps',
  location: 'http://localhost:9431/ssdp/device-desc.xml',
  name: 'MatchStick_MAC_b93d',
  model: 'MatchStick'
};

var s = new Sender(device);
s.appURL = 'http://openflint.github.io/hello-world-sample/index.html';
s.appID = '~hello-world';

// system control
s.systemControl('GET_MUTED', function (err, value) {
  console.log('muted:', value);
});
s.systemControl('GET_VOLUME', function (err, value) {
  console.log('volume:', value);

  console.log('will set volume');
  s.systemControl('SET_VOLUME', 0.333, function (err) {
    s.systemControl('GET_VOLUME', function (err, value) {
      console.log('volume:', value);
    });
  });
});

// app launch, state and close
console.log('will launch app');
s.launchApp(function (err) {
  if (err) {
    console.error('ERROR - failed to launch app - %s', err);
    return;
  }

  console.log('app launched');

  s.getState(function (err, state) {
    if (err) {
      console.error('ERROR - failed to get state - %s', err);
      return;
    }

    console.log('app state:', state);
  });

  setTimeout(function () {
    console.log('will close app');
    s.closeApp(function (err) {
      if (err) {
        console.error('ERROR - failed to close app - %s', err);
        return;
      }

      console.log('app closed');

      s.getState(function (err, state) {
        if (err) {
          console.error('ERROR - failed to get state - %s', err);
          return;
        }

        console.log('app state:', state);
      });
    });
  }, 3000);
});

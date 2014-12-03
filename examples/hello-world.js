/* jshint node:true */
'use strict';

var Sender = require('../');

var device = {
  location: 'http://10.0.1.46:9431/ssdp/device-desc.xml',
  applicationUrl: 'http://10.0.1.46:9431/apps',
  name: 'MatchStick_MAC_b93d',
  model: 'MatchStick'
};

var s = new Sender();
s.device = device;
s.appURL = 'http://openflint.github.io/hello-world-sample/index.html';
s.appID = '~hello-world';

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

    console.log('app state %s', state);
  });

  setTimeout(function () {
    console.log('will close app');
    s.closeApp(function (err) {
      if (err) {
        console.error('ERROR - failed to close app - %s', err);
        return;
      }

      console.log('app closed');

      s.token = null;
      s.getState(function (err, state) {
        if (err) {
          console.error('ERROR - failed to get state - %s', err);
          return;
        }

        console.log('app state %s', state);
      });
    });
  }, 2500);
});

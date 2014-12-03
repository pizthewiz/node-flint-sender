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

s.launchApp(function (err, res, body) {
  if (err) {
    console.error('ERROR - failed to launch app - %s', err);
    return;
  }

  console.log(body);

  setTimeout(function () {
    // console.log('will close');
    // s.closeApp(function (err, res, body) {
    //   if (err) {
    //     console.error('ERROR - failed to close app - %s', err);
    //     return;
    //   }
    //
    //   console.log(body);
    // });
  }, 2500);
});

/* jshint node:true */
'use strict';

var DeviceScanner = require('../').DeviceScanner;

var scanner = new DeviceScanner();
scanner.on('device', function (device) {
  console.log('found \'%s\' with application URL: %s', device.name, device.applicationUrl);
});
console.log('will start scanner');
scanner.start();

// quit after 60 seconds
setTimeout(function () {
  console.log('will stop scanner');
  scanner.stop();

  var deviceCount = scanner.devices.length;
  console.log('scanner found %s device%s', deviceCount, deviceCount !== 1 ? 's' : '');

  process.exit(0);
}, 60 * 1000);

'use strict';

var DeviceScanner = require('../').DeviceScanner;

var scanner = new DeviceScanner();
scanner.on('device', function (device) {
  console.log('found:', device.name);
});
console.log('will start scanner');
scanner.start();

setTimeout(function () {
  console.log('will stop scanner');
  scanner.stop();

  var deviceCount = scanner.devices.length;
  console.log('scanner found %s device%s', deviceCount, deviceCount !== 1 ? 's' : '');
}, 60 * 1000);

'use strict';

var DeviceScanner = require('../').DeviceScanner;

var scanner = new DeviceScanner();
scanner.start();

setTimeout(function () {
  console.log('will stop scanner');
  scanner.stop();

  console.log('devices', scanner.devices);
}, 30 * 1000);

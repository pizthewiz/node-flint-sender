/* jshint node:true */
'use strict';

var events = require('events');
var util = require('util');

var dial = require('dial');

DeviceScanner.MANUFACTURER = 'openflint';

function DeviceScanner() {
  var self = this;

  events.EventEmitter.call(self);

  self.devices = [];
  self.isScanning = false;
  self.interval = null;
  self.discoverDelay = 12 * 1000;

  dial.on('device', function (device) {
    // only pass along openflint devices
    if (device.info.manufacturer !== DeviceScanner.MANUFACTURER) {
      return;
    }

    var status = self.devices.some(function (d) {
      return d.info.UDN === device.info.UDN;
    });
    if (!status) {
      self.devices.push(device);
      self.emit('device', device);
    }
  });
}

util.inherits(DeviceScanner, events.EventEmitter);

DeviceScanner.prototype.start = function () {
  var self = this;

  self.devices = [];

  dial.discover();
  self.interval = setInterval(function () {
    dial.discover();
  }, self.discoverDelay);

  self.isScanning = true;
};

DeviceScanner.prototype.stop = function () {
  var self = this;

  clearInterval(self.interval);
  self.interval = null;

  self.isScanning = false;
};

module.exports = DeviceScanner;

/* jshint node:true */
'use strict';

var events = require('events');
var util = require('util');

var dial = require('dial');

var OPENFLINT_MANUFACTURER = 'openflint';

function DeviceScanner() {
  var self = this;

  events.EventEmitter.call(self);

  self.devices = [];
  self.isScanning = false;

  self._rescanInterval = null;

  dial.on('device', function (device) {
    // only pass along openflint devices
    if (device.info.manufacturer !== OPENFLINT_MANUFACTURER) {
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

var RESCAN_DELAY = 12 * 1000;
DeviceScanner.prototype.start = function () {
  var self = this;

  if (self.isScanning) {
    return;
  }

  self.devices = [];

  self._rescanInterval = setInterval(function () {
    dial.discover();
  }, RESCAN_DELAY);
  dial.discover();

  self.isScanning = true;
};

DeviceScanner.prototype.stop = function () {
  var self = this;

  if (!self.isScanning) {
    return;
  }

  self.isScanning = false;

  clearInterval(self._rescanInterval);
  self._rescanInterval = null;
};

module.exports = DeviceScanner;

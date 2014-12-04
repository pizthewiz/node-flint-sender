/* jshint node:true */
'use strict';

var events = require('events');
var util = require('util');

var dial = require('dial')

function DeviceScanner() {
  var self = this;

  events.EventEmitter.call(self);

  self.devices = [];
  self.isScanning = false;
  self.interval = null;

  dial.on('device', function (device) {
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
  }, 15 * 1000);

  self.isScanning = true;
};

DeviceScanner.prototype.stop = function () {
  var self = this;

  clearInterval(self.interval);
  self.interval = null;

  self.isScanning = false;
}

module.exports = DeviceScanner;

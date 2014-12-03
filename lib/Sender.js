/* jshint node:true */
'use strict';

var events = require('events');
var util = require('util');

var request = require('request');

function Sender() {
  var self = this;

  events.EventEmitter.call(self);

  self.device = null;
  self.appID = null;
  self.appURL = null;

  self.token = null;
}

util.inherits(Sender, events.EventEmitter);

Sender.prototype.launchApp = function (cb) {
  var self = this;

  var uri = util.format('%s/%s', self.device.applicationUrl, self.appID);
  var body = {
    type: 'launch', // launch, relaunch, join
    app_info: {
      url: self.appURL,
      useIpc: false, // needs WebSocket channel
      maxInactive: -1 // receiver running time, -1 is forever
    }
  };
  request({uri: uri, method: 'POST', body: body, json: true}, function (err, res, body) {
    self.token = body.token;
    // TODO: handle body.interval, the heartbeat interval

    cb(err, res, body);
  });
};

Sender.prototype.getState = function (cb) {
  var self = this;

  var uri = util.format('%s/%s', self.device.applicationUrl, self.appID);
  var headers = {
    'Accept': 'application/xml; charset=utf8',
    'Authorization': self.token
  };
  request({uri: uri, method: 'GET', headers: headers}, function (err, res, body) {
    // TODO: parse
    cb(err, res, body);
  });
};

Sender.prototype.closeApp = function (cb) {
  var self = this;

  var uri = util.format('%s/%s/run', self.device.applicationUrl, self.appID);
  var headers = {
    'Accept': 'application/xml; charset=utf8',
    'Authorization': self.token
  };
  request({uri: uri, method: 'DELETE', headers: headers}, function (err, res, body) {
    cb(err, res, body);
  });
};

module.exports = Sender;

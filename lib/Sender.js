/* jshint node:true */
'use strict';

var events = require('events');
var util = require('util');
var extend = require('util')._extend

var request = require('request');
var xml2js = require('xml2js');

function Sender() {
  var self = this;

  events.EventEmitter.call(self);

  self.device = null;
  self.appID = null;
  self.appURL = null;

  self.token = null;
  self.state = null;
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
      maxInactive: -1 // when useIpc is false, receiver running time in ms, -1 is forever
    }
  };
  request({uri: uri, method: 'POST', body: body, json: true}, function (err, res, body) {
    self.token = body.token;
    // TODO: handle body.interval, the heartbeat interval

    // NB: res.statusCode === 201 launched by request, === 200 already running

    cb(err);
  });
};

Sender.prototype.getState = function (cb) {
  var self = this;

  var uri = util.format('%s/%s', self.device.applicationUrl, self.appID);
  var headers = {
    'Accept': 'application/xml; charset=utf8'
  };
  if (self.token) {
    extend(headers, {'Authorization': self.token});
  }
  request({uri: uri, method: 'GET', headers: headers}, function (err, res, body) {
    var parser = new xml2js.Parser();
    parser.parseString(body, function (err, result) {
//      console.log(util.inspect(body));
//      console.log(util.inspect(result));
      var state = result.service.state[0];
      if (state === 'running' || state === 'stopped') {
        self.state = state;
      }

      cb(err, self.state);
    });
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
    cb(err);
  });
};

module.exports = Sender;

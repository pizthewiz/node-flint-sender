/* jshint node:true */
'use strict';

var events = require('events');
var util = require('util');
var extend = require('util')._extend;

var request = require('request');
var xml2js = require('xml2js');

Sender.appStates = {
  STARTING: 'starting',
  RUNNING: 'running',
  STOPPED: 'stopped'
};

Sender.launchTypes = {
  LAUNCH: 'launch',
  RELAUNCH: 'relaunch',
  JOIN: 'join'
};

Sender.systemControlTypes = {
  GET_VOLUME: 'GET_VOLUME',
  SET_VOLUME: 'SET_VOLUME',
  GET_MUTED: 'GET_MUTED',
  SET_MUTED: 'GET_MUTED'
};

function Sender() {
  var self = this;

  events.EventEmitter.call(self);

  self.device = null;
  self.appID = null;
  self.appURL = null;

  self.state = null;
  self.token = null;
}

util.inherits(Sender, events.EventEmitter);

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
      self.state = result.service.state[0];

      cb(err, self.state);
    });
  });
};

Sender.prototype.launchApp = function (cb) {
  var self = this;

  var uri = util.format('%s/%s', self.device.applicationUrl, self.appID);
  var body = {
    type: Sender.launchTypes.LAUNCH,
    app_info: {
      url: self.appURL,
      useIpc: false, // needs WebSocket channel
      maxInactive: -1 // when useIpc is false, receiver running time in ms, -1 is forever
    }
  };
  request({uri: uri, method: 'POST', body: body, json: true}, function (err, res, body) {
    // NB: res.statusCode === 201 launched by request, === 200 already running

    self.token = body.token;
    // TODO: handle body.interval, the heartbeat interval

    cb(err);
  });
};

Sender.prototype.closeApp = function (cb) {
  var self = this;

  var uri = util.format('%s/%s/run', self.device.applicationUrl, self.appID);
  var headers = {
    'Authorization': self.token
  };
  request({uri: uri, method: 'DELETE', headers: headers}, function (err, res, body) {
    // NB: res.statusCode === 400 stale appID === 404 app not found, === 200 good to go

    cb(err);
  });
};

Sender.prototype.systemControl = function (type, value, cb) {
  var self = this;

  if (typeof value === 'function') {
    cb = value;
  }

  // really odd REST semantics https://github.com/openflint/flingd-coffee/issues/2
  var uri = util.format('%s/system/control', self.device.applicationUrl.replace(/\/apps$/, ''));
  var body = {
    type: type
  };
  if (type === Sender.systemControlTypes.SET_VOLUME) {
    extend(body, {level: value});
  } else if (type === Sender.systemControlTypes.SET_MUTED) {
    extend(body, {muted: value});
  }
  request({uri: uri, method: 'POST', body: body, json: true}, function (err, res, body) {
    // only the GET_* requests return content https://github.com/openflint/flingd-coffee/issues/1
    var result = null;
    if (body && body.success) {
      if (body.request_type === Sender.systemControlTypes.GET_VOLUME) {
          result = body.level;
      } else if (body.request_type === Sender.systemControlTypes.GET_MUTED) {
        result = body.muted;
      }
    }

    cb(err, result);
  });
};

module.exports = Sender;

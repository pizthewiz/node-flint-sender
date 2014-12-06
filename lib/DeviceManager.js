/* jshint node:true */
'use strict';

var events = require('events');
var util = require('util');
var extend = require('util')._extend;

var request = require('request');
var xml2js = require('xml2js');

DeviceManager.appStates = {
  STARTING: 'starting',
  RUNNING: 'running',
  STOPPED: 'stopped'
};

DeviceManager.launchTypes = {
  LAUNCH: 'launch',
  RELAUNCH: 'relaunch',
  JOIN: 'join'
};

DeviceManager.systemControlTypes = {
  GET_VOLUME: 'GET_VOLUME',
  SET_VOLUME: 'SET_VOLUME',
  GET_MUTED: 'GET_MUTED',
  SET_MUTED: 'SET_MUTED'
};

function DeviceManager(device) {
  var self = this;

  events.EventEmitter.call(self);

  self.device = device;
  var matches = device.applicationUrl.match(/(https?):\/\/(.+):(\d+)/);
  if (matches) {
    self.device.host = matches[2];
    self.device.port = parseInt(matches[3], 10);
  }

  self.appID = null;
  self.appURL = null;

  self.appState = null;
  self.appToken = null;
}

util.inherits(DeviceManager, events.EventEmitter);

DeviceManager.prototype.getAppState = function (cb) {
  var self = this;

  var uri = util.format('%s/%s', self.device.applicationUrl, self.appID);
  var headers = {
    'Accept': 'application/xml; charset=utf8'
  };
  if (self.appToken) {
    extend(headers, {'Authorization': self.appToken});
  }
  request({uri: uri, method: 'GET', headers: headers}, function (err, res, body) {
    var parser = new xml2js.Parser();
    parser.parseString(body, function (err, result) {
      self.appState = result.service.state[0];

      cb(err, self.appState);
    });
  });
};

DeviceManager.prototype.launchApp = function (appURL, cb) {
  var self = this;

  self.appURL = appURL;

  var uri = util.format('%s/%s', self.device.applicationUrl, self.appID);
  var body = {
    type: DeviceManager.launchTypes.LAUNCH,
    app_info: {
      url: self.appURL,
      useIpc: false, // needs WebSocket channel
      maxInactive: -1 // when useIpc is false, receiver running time in ms, -1 is forever
    }
  };
  request({uri: uri, method: 'POST', body: body, json: true}, function (err, res, body) {
    // NB: res.statusCode === 201 launched by request, === 200 already running

    self.appToken = body.token;
    // TODO: handle body.interval, the heartbeat interval

    cb(err);
  });
};

DeviceManager.prototype.quitApp = function (cb) {
  var self = this;

  if (!self.appToken) {
    cb(new Error("application token required"));
    return;
  }

  var uri = util.format('%s/%s/%s', self.device.applicationUrl, self.appID, 'run');
  var headers = {
    'Authorization': self.appToken
  };
  request({uri: uri, method: 'DELETE', headers: headers}, function (err, res, body) {
    // NB: res.statusCode === 400 stale appID === 404 app not found, === 200 good to go

    self.appToken = null;

    cb(err);
  });
};

DeviceManager.prototype.systemControl = function (type, value, cb) {
  var self = this;

  if (typeof value === 'function') {
    cb = value;
  }

  // really odd REST semantics https://github.com/openflint/flingd-coffee/issues/2
  var uri = util.format('%s/system/control', self.device.applicationUrl.replace(/\/apps$/, ''));
  var body = {
    type: type
  };
  if (type === DeviceManager.systemControlTypes.SET_VOLUME) {
    extend(body, {level: value});
  } else if (type === DeviceManager.systemControlTypes.SET_MUTED) {
    extend(body, {muted: value});
  }
  request({uri: uri, method: 'POST', body: body, json: true}, function (err, res, body) {
    // only the GET_* requests return content https://github.com/openflint/flingd-coffee/issues/1
    var result = null;
    if (body && body.success) {
      if (body.request_type === DeviceManager.systemControlTypes.GET_VOLUME) {
          result = body.level;
      } else if (body.request_type === DeviceManager.systemControlTypes.GET_MUTED) {
        result = body.muted;
      }
    }

    cb(err, result);
  });
};

module.exports = DeviceManager;

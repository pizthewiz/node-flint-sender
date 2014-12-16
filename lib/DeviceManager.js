/* jshint node:true */
'use strict';

var events = require('events');
var util = require('util');
var extend = require('util')._extend;

var request = require('request');
var xml2js = require('xml2js');

var MessageChannel = require('./MessageChannel');

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

  self.appID = null;
  self.appURL = null;

  self.appToken = null;
  self.appHeartbeatDelay = 0;

  self._heartbeatInterval = null;
  self._launchStateInterval = null;
}

util.inherits(DeviceManager, events.EventEmitter);

DeviceManager.prototype._reset = function () {
  var self = this;

  self.appToken = null;
  self.appHeartbeatDelay = 0;

  if (self._heartbeatInterval) {
    clearInterval(self._heartbeatInterval);
    self._heartbeatInterval = null;
  }
  if (self._launchStateInterval) {
    clearInterval(self._launchStateInterval);
    self._launchStateInterval = null;
  }
};

DeviceManager.prototype._callbackOrEmit = function (cb, event, err) {
  var self = this;

  var args = Array.prototype.slice.call(arguments);

  if (typeof cb === 'function') {
    args.splice(0, 2);
    cb.apply(self, args);
  } else {
    args.splice(0, 1);
    if (!err) {
      args.splice(1, 1);
    }
    self.emit.apply(self, args);
  }
};

DeviceManager.prototype._setupHeartbeat = function () {
  var self = this;

  var heartbeatFunction = function () {
    var uri = util.format('%s/%s', self.device.applicationUrl, self.appID);
    var headers = {
      'Accept': 'application/xml; charset=utf8',
      'Authorization': self.appToken
    };
    request({uri: uri, method: 'GET', headers: headers}, function (err, res, body) {
      // 🎈
    });
  };

  self._heartbeatInterval = setInterval(function () {
    heartbeatFunction();
  }, self.appHeartbeatDelay);
  heartbeatFunction();
};

DeviceManager.prototype._setupLaunchStatePolling = function () {
  var self = this;

  var stateHandler = function (err, state, data) {
    if (err || !data.additionalData || !data.additionalData[0].channelBaseUrl) {
      return;
    }

    // clean up
    clearInterval(self._launchStateInterval);
    self._launchStateInterval = null;

    var url = data.additionalData[0].channelBaseUrl[0];
    var channel = new MessageChannel(url);
    // TODO - no callback pairing?
    self.emit('channel', channel);
  };

  self._launchStateInterval = setInterval(function () {
    self.getAppState(stateHandler);
  }, 750);
  self.getAppState(stateHandler);
};

DeviceManager.prototype._systemControl = function (type, value, cb, event) {
  var self = this;

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
    if (err) {
      self._callbackOrEmit(cb, 'error', err);
      return;
    }

    // only the GET_* requests return content https://github.com/openflint/flingd-coffee/issues/1
    var result = value;
    if (body && body.success) {
      if (body.request_type === DeviceManager.systemControlTypes.GET_VOLUME) {
        result = body.level;
      } else if (body.request_type === DeviceManager.systemControlTypes.GET_MUTED) {
        result = body.muted;
      }
    }

    self._callbackOrEmit(cb, event, null, result);
  });
};

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
      if (err) {
        self._callbackOrEmit(cb, 'error', err);
        return;
      }

      var state = result.service.state[0];

      self._callbackOrEmit(cb, 'state', null, state, result.service);
    });
  });
};

DeviceManager.prototype.launchApp = function (appURL, options, cb) {
  var self = this;

  if (typeof options === 'function') {
    cb = options;
  }

  self._reset();
  self.appURL = appURL;

  options = extend({
    type: DeviceManager.launchTypes.LAUNCH,
    messageChannel: false, // needs WebSocket channel
    maxInactive: -1 // when useIpc is false, receiver running time in ms, -1 is forever
  }, options);

  var uri = util.format('%s/%s', self.device.applicationUrl, self.appID);
  var body = {
    type: options.type,
    app_info: {
      url: self.appURL,
      useIpc: options.messageChannel,
      maxInactive: options.maxInactive
    }
  };
  request({uri: uri, method: 'POST', body: body, json: true}, function (err, res, body) {
    if (err) {
      self._callbackOrEmit(cb, 'error', err);
      return;
    }
    if (res.statusCode == 400) {
      var e = new Error(util.format('unable to %s', options.type));
      self._callbackOrEmit(cb, 'error', e);
      return;
    }

    // NB: res.statusCode === 201 launched by request, === 200 already running
    self.appToken = body.token;
    self.appHeartbeatDelay = body.interval;

    if (options.messageChannel) {
      // ping-pong to keep the token alive
      self._setupHeartbeat();

      // poll app state for the message channel URL
      self._setupLaunchStatePolling();
    }

    self._callbackOrEmit(cb, 'launch');
  });
};

DeviceManager.prototype.quitApp = function (cb) {
  var self = this;

  var instance = 'run';
  var uri = util.format('%s/%s/%s', self.device.applicationUrl, self.appID, instance);
  var headers = {
    'Authorization': self.appToken
  };
  request({uri: uri, method: 'DELETE', headers: headers}, function (err, res, body) {
    if (err) {
      self._callbackOrEmit(cb, 'error', err);
      return;
    }

    // NB: res.statusCode === 400 stale appID === 404 app not found, === 200 good to go

    self._callbackOrEmit(cb, 'quit');
  });

  self._reset();
};

DeviceManager.prototype.getVolume = function (cb) {
  this._systemControl(DeviceManager.systemControlTypes.GET_VOLUME, null, cb, 'volume');
};

DeviceManager.prototype.setVolume = function (value, cb) {
  this._systemControl(DeviceManager.systemControlTypes.SET_VOLUME, value, cb, 'volume');
};

DeviceManager.prototype.getMuted = function (cb) {
  this._systemControl(DeviceManager.systemControlTypes.GET_MUTED, null, cb, 'muted');
};

DeviceManager.prototype.setMuted = function (value, cb) {
  this._systemControl(DeviceManager.systemControlTypes.SET_MUTED, value, cb, 'muted');
};

module.exports = DeviceManager;

/* jshint node:true */
'use strict';

var events = require('events');
var util = require('util');
var extend = require('util')._extend;

var request = require('request');
var xml2js = require('xml2js');

// var MessageChannel = require('./MessageChannel');

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

DeviceManager.prototype._clear = function () {
  var self = this;

  self.appToken = null;
  self.appHeartbeatDelay = 0;

  if (self._heartbeatInterval) {
    clearInterval(self._heartbeatInterval);
  }
  self._heartbeatInterval = null;

  if (self._launchStateInterval) {
    clearInterval(self._launchStateInterval);
  }
  self._launchStateInterval = null;
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
};

DeviceManager.prototype._setupLaunchStatePolling = function () {
  var self = this;

  var callback = function (state, data) {
    if (data.additionalData && data.additionalData[0].channelBaseUrl) {
      var url = data.additionalData[0].channelBaseUrl[0];

      // TODO: create MessageChannel and emit

      self.removeListener('state', callback);

      clearInterval(self._launchStateInterval);
      self._launchStateInterval = null;
    }
  };
  self.addListener('state', callback);

  self._launchStateInterval = setInterval(function () {
    self.getAppState();
  }, 750);
  self.getAppState();
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
        if (typeof cb === 'function') {
          cb(err);
        } else {
          self.emit('error', err);
        }
        return;
      }

      var state = result.service.state[0];

      if (typeof cb === 'function') {
        cb(null, state, result.service);
      } else {
        self.emit('state', state, result.service);
      }
    });
  });
};

DeviceManager.prototype.launchApp = function (appURL, options, cb) {
  var self = this;

  if (typeof options === 'function') {
    cb = options;
  }

  self._clear();
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
      if (typeof cb === 'function') {
        cb(err);
      } else {
        self.emit('error', err);
      }
      return;
    }
    if (res.statusCode == 400) {
      var e = new Error(util.format('unable to %s', options.type));
      if (typeof cb === 'function') {
        cb(e);
      } else {
        self.emit('error', e);
      }
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

    if (typeof cb === 'function') {
      cb(null);
    } else {
      self.emit('launch');
    }
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
      if (typeof cb === 'function') {
        cb(err);
      } else {
        self.emit('error', err);
      }
      return;
    }

    // NB: res.statusCode === 400 stale appID === 404 app not found, === 200 good to go

    if (typeof cb === 'function') {
      cb(null);
    } else {
      self.emit('quit');
    }
  });

  self._clear();
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
    if (err) {
      if (typeof cb === 'function') {
        cb(err);
      } else {
        self.emit('error', err);
      }
      return;
    }

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

DeviceManager.prototype.getVolume = function (cb) {
  this.systemControl(DeviceManager.systemControlTypes.GET_VOLUME, cb);
};

DeviceManager.prototype.setVolume = function (value, cb) {
  this.systemControl(DeviceManager.systemControlTypes.SET_VOLUME, value, cb);
};

DeviceManager.prototype.getMuted = function (cb) {
  this.systemControl(DeviceManager.systemControlTypes.GET_MUTED, cb);
};

DeviceManager.prototype.setMuted = function (value, cb) {
  this.systemControl(DeviceManager.systemControlTypes.SET_MUTED, value, cb);
};

module.exports = DeviceManager;

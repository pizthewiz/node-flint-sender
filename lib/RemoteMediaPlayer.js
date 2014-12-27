/* jshint node:true */
'use strict';

// sender side to integrate with the default player: https://github.com/openflint/flint-player
//  https://github.com/openflint/flint-receiver-sdk/blob/gh-pages/v1/libs/mediaplayer.js

var events = require('events');
var util = require('util');

var MESSAGE_TYPES = {
  LOAD: {
    type: 'LOAD',
    requestId: 'requestId-2'
  },
  PAUSE: {
    type: 'PAUSE',
    requestId: 'requestId-4'
  },
  PLAY: {
    type: 'PLAY',
    requestId: 'requestId-5'
  },
  VOLUME: {
    type: 'SET_VOLUME',
    requestId: 'requestId-W'
  },
  SEEK: {
    type: 'SEEK',
    requestId: 'requestId-X'
  },
  PING: {
    type: 'PING',
    requestId: 'requestId-Y'
  },
  STATUS: {
    type: 'GET_STATUS',
    requestId: 'requestId-Z'
  },
};

// see: http://www.matchstick.tv/developers/documents/supported-media.html
var FILE_EXTENSION_RE = new RegExp(/mp4|m4v|webm|mkv$/i);
var CONTENT_TYPES = {
  mp4: 'video/mp4',
  m4v: 'video/x-m4v',
  webm: 'video/webm',
  mkv: 'video/x-matroska'
};

function RemoteMediaPlayer(channel) {
  var self = this;

  events.EventEmitter.call(self);

  self.channel = channel;

  self.channel.on('message', function (data) {
    data = JSON.parse(data);
    data.payload = JSON.parse(data.payload);

    self.emit('message', data);
  });
}

util.inherits(RemoteMediaPlayer, events.EventEmitter);

RemoteMediaPlayer.prototype._send = function (data, cb) {
  // perform weird double stringify https://github.com/openflint/flint-player/issues/1
  data.payload = JSON.stringify(data.payload);

  this.channel.send(JSON.stringify(data), cb);
};

RemoteMediaPlayer.prototype._messageBase = function (messageType) {
  return {
    namespace: 'urn:flint:org.openflint.fling.media',
    payload: {
      type: messageType.type,
      requestId: messageType.requestID
    }
  };
};

function contentTypeForFilepath(filepath) {
  var fileExtension = filepath.toLowerCase().match(FILE_EXTENSION_RE)[0];
  return CONTENT_TYPES[fileExtension];
}

RemoteMediaPlayer.prototype.load = function (url, cb) {
  var contentType = contentTypeForFilepath(url);
  var data = this._messageBase(MESSAGE_TYPES.LOAD);
  data.payload.media = {
    contentId: url,
    contentType: contentType,
    metadata: {
      title: '',
      subtitle: ''
    }
  };
  this._send(data, cb);
};

RemoteMediaPlayer.prototype.pause = function (cb) {
  var data = this._messageBase(MESSAGE_TYPES.PAUSE);
  this._send(data, cb);
};

RemoteMediaPlayer.prototype.play = function (cb) {
  var data = this._messageBase(MESSAGE_TYPES.PLAY);
  this._send(data, cb);
};

RemoteMediaPlayer.prototype.volume = function (value, cb) {
  var data = this._messageBase(MESSAGE_TYPES.VOLUME);
  data.payload.volume = {
    level: value
  };
  this._send(data, cb);
};

RemoteMediaPlayer.prototype.muted = function (value, cb) {
  var data = this._messageBase(MESSAGE_TYPES.VOLUME);
  data.payload.volume = {
    muted: value
  };
  this._send(data, cb);
};

RemoteMediaPlayer.prototype.seek = function (value, cb) {
  var data = this._messageBase(MESSAGE_TYPES.SEEK);
  data.payload.currentTime = value;
  this._send(data, cb);
};

RemoteMediaPlayer.prototype.status = function (cb) {
  var data = this._messageBase(MESSAGE_TYPES.STATUS);
  this._send(data, cb);
};

module.exports = RemoteMediaPlayer;

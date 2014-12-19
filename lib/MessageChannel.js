/* jshint node:true */
'use strict';

var events = require('events');
var util = require('util');
var extend = require('util')._extend;

var WebSocket = require('ws');

function MessageChannel(url) {
  var self = this;

  events.EventEmitter.call(self);

  self.url = url;
  self.ws = new WebSocket(self.url);
  self.isConnected = false;

  self.ws.on('open', function () {
    self.isConnected = true;
    // console.info('🐛 channel open');
    self.emit('open');
  });
  self.ws.on('close', function () {
    self.isConnected = false;
    // console.info('🐛 channel close');
    self.emit('close');
  });
  self.ws.on('error', function (err) {
    // console.info('🐛 channel error:', util.inspect(err));
    self.emit('error', err);
  });
  self.ws.on('message', function (data, flags) {
    // console.info('🐛 channel message:', util.inspect(data), util.inspect(flags));
    self.emit('message', data, flags);
  });
}

util.inherits(MessageChannel, events.EventEmitter);

MessageChannel.prototype.send = function (data, cb) {
  var self = this;

  self.ws.send(data, cb);
};

module.exports = MessageChannel;

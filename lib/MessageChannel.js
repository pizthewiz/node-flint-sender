/* jshint node:true */
'use strict';

var events = require('events');
var util = require('util');
var extend = require('util')._extend;

function MessageChannel(device) {
  var self = this;

  events.EventEmitter.call(self);
}

util.inherits(MessageChannel, events.EventEmitter);

module.exports = MessageChannel;

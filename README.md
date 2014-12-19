# node-flint-sender

Flint is a service that builds on the [DIAL](http://www.dial-multiscreen.org/) (**DI**scovery **A**nd **L**aunch) protocol, using the DIAL Service Discovery component for discovery, an extended version of the DIAL REST Service component for receiver app execution control and a WebSocket Service channel for communication with receiver apps.

The first piece of hardware to use Flint is the [Matchstick](http://matchstick.tv), an open hardware/software HDMI streaming stick that runs [Firefox OS](https://www.mozilla.org/en-US/firefox/os/). A pure-software Flint service can be used in lieu of hardware, see the [flingd-coffee](https://github.com/openflint/flingd-coffee) project (NB - it is unclear if this is the actual daemon that runs on the Matchstick hardware).

### EXAMPLES

Device Detection:
```javascript
var scanner = new DeviceScanner();
scanner.on('device', function (device) {
  console.log('found:', device.name);
});
scanner.start();
```

Application Launch:
```javascript
var appID = '~hello-world';
var appURL = 'http://openflint.github.io/hello-world-sample/index.html';

var manager = manager = new DeviceManager(device);
manager.appID = appID;

manager.on('launch', function () {
  console.log('launched');
});

manager.launchApp(appURL);
```

Messaging:

```javascript
manager.on('channel', function (channel) {
  console.log('channel created');

  channel.on('open', function () {
    console.log('channel opened');

    var data = JSON.stringify({
      oscillator: { waveform: 'PULSE', suboscillator: '5TH' }
    });
    channel.send(data);
  });
});

manager.launchApp(appURL, {messageChannel: true});
```

System Control:
```javascript
manager.on('volume', function (value) {
  console.log('volume:', value);
});
manager.getVolume();
manager.setVolume(0.667);

manager.on('muted', function (value) {
  console.log('muted:', value);
});
manager.getMuted();
manager.setMuted(true);
```

### MOTIVATION
While the [OpenFlint](http://www.openflint.org/) team has made the [flint-web-sender-sdk](https://github.com/openflint/flint-web-sender-sdk) available, it targets the browser and using shim modules to get it working in a Node.js environment like [node-XMLHttpRequest](https://github.com/driverdan/node-XMLHttpRequest) and [xmldom](https://github.com/jindw/xmldom) leaves something to be desired.

### NOTES
Perhaps the best breakdown on Flint itself is available as part of the [flingd-coffee](https://github.com/openflint/flingd-coffee) project [doc/fling/en/flint.md](https://github.com/openflint/flingd-coffee/blob/master/doc/fling/en/flint.md). Naturally [openflint.org](https://github.com/openflint/openflint.github.io/wiki) has details as well, and the [flingone](https://github.com/flingone) GitHub org hosts the forks of the lower-level kernel and OS pieces.

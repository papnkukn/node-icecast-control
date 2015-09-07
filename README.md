# node-icecast-control

A [Node.js](http://nodejs.org/) script to control your own [Icecast](http://icecast.org/) internet radio station, server-side.

`NOTE: This is an early alpha version, initial setup may take time, so please be patient`

## Introduction

The basic idea is to install the Icecast + ices0 as usual then control the playlist with Node.js script.
Since radio station .conf allows only `builtin`, `python` and `perl` modules the python is used as proxy.
So the python script and Node.js communicate via [socket.io](http://socket.io/) where python requests a tracks and Node.js pushes back the track path and info.

## Getting Started

[Setup](#Setup) procedure is inevitable.

Include the IcecastControl into script
```javascript
var IcecastControl = require("./icecast/control.js");
```

Define options:
```javascript
var options = {
	verbose: false,
	confdir: "/etc/icecast",  //Directory to store auto-generated .conf and .py file, NOTE: the directory must exist and have write permissions
	tempdir: "/tmp",          //Directory for temporary files, NOTE: the directory must exist
	icescmd: "ices",          //"ices" or "ices0" or other shell command
	socket: {
		host: "localhost",    //Server socket host
		port: 3020            //Server socket port to be open by node.js
	},
	icecast: {
		host: "localhost",    //Socket host of the icecast
		port: 8000,           //Socket port of the icecast
		user: "admin",
		password: "hackme"
	}
};
```

Set station info, note that the playlist must exist
```javascript
var station = {
	id: "evergreen",                              //This will be file name, only ASCII number and letters allowed
	name: "Evergreen songs",                      //Human readable station title
	genre: "Evergreen",                           //Genre
	description: "Good old songs",                //Description of the station
	mountpoint: "/evergreen",                     //Stream will be available at http://localhost:8000/evergreen
	url: "http://radio-info-website-goes-here/",  //Website providing information about the station
	playlist: "/path/to/music/playlist.m3u",      //Static playlist, if you want to control the playlist see the "module" property
	yp: false                                     //Publish to yp directory
};
```

Set another station, this one with dynamic playlist
```javascript
var station = {
	id: "foo",
	name: "foo bar station",
	mountpoint: "/foo",
	playlist: "dummy.m3u",
	module: {
		ices_init: function() { return 1; }, //1..succes, 0..failed
		ices_shutdown: function() { console.log("ices_shutdown"); },
		ices_get_next: function() { return "/path/to/track.mp3"; },
		ices_get_metadata: function() { return "Author - Track (Album, Year)"; }
	}
};
```

Open radio stations on Icecast and start the playback
```javascript
var ic = new IcecastControl(options);
var is = ic.createStation(station);
ic.open(); //Open server socket
is.load(); //Load playlist
is.play(); //Start ices
```

Yeah, it's working!
```
foo@ubuntu:/home/foo/icecast# node app.js
Station registered with token: 6e0b0568-2f13-40cb-8b5a-9e948c46405b
Socket listening at port 3020
Found 56 tracks in playlist
ices -c "/etc/icecast/conf.d/dalmatinske.conf"
{ file: '/home/goldfish/radio/dalmatinske/Bajaga - Plavi safir.mp3',
  meta: 'Bajaga - Plavi safir' }
```

## Setup

The procedure is described for Ubuntu 12.10 x64

First, install `Icecast`
```
sudo apt-get update
sudo apt-get install icecast2
```

Optionally edit port and restart
```
sudo nano /etc/icecast2/icecast.xml
sudo service icecast2 restart
```

Second, install `ices` to stream mp3 audio
```
sudo apt-get install python-dev
sudo apt-get install libmp3lame-dev libxml2-dev libshout-dev libvorbis-dev
```

```
cd /tmp
wget http://downloads.us.xiph.org/releases/ices/ices-0.4.tar.gz
tar xf ices-0.4.tar.gz
cd ices-0.4/
./configure --prefix=/usr/local --with-pic --with-lame --with-python
make
make install
```

```
sudo mkdir /etc/ices
sudo cp /usr/local/etc/ices.conf.dist /etc/ices/ices.conf
```

Optionally test the `ices`
```
/usr/local/bin/ices -c /etc/ices/ices.conf -v
```

Now, make sure you have `node` and `npm` installed
```
sudo apt-get install nodejs-legacy npm
```

Finally, install the `node-icecast-control` script
```
git clone https://github.com/papnkukn/node-icecast-control.git
cd node-icecast-control
npm install
```

Edit the `app.js` and change station info then start the script. Also make sure the `confdir` and `tempdir` directories exist with write permissions.
```
node app.js
```

## Recommended

[icecast-utils](https://github.com/alvassin/nodejs-icecast-utils/) for realtime icecast statistics

var fs = require('fs');
var path = require('path');

var IcecastStation = require('./station.js');

var io = null;
var server = null;

//TODO: Convert to lower case, replace spaces with hyphens, replace non-ASCII chars, etc.
function slug(value) {
	return value;
}

//Simplified html encode
function htmlencode(html) {
	html = html.replace(/&/g, '&amp;');
	html = html.replace(/</g, '&lt;');
	html = html.replace(/>/g, '&gt;');
	return html;
}

//Generate guid
function guid() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
		return v.toString(16);
	});
}

/**************************************************************************************//**
 * Constructor
 ******************************************************************************************/
function IcecastControl(options) {
	this.options = options;
	this.stations = { };
	
	this.getGenericConfFile = function() {
		return path.join("icecast", "generic.conf");
	}

	this.getGenericModuleFile = function() {
		return path.join("icecast", "generic.py");
	}
	
	this.getStationConfFile = function(id) {
		return path.join(this.options.confdir, slug(id) + ".conf");
	}

	this.getStationModuleFile = function(id) {
		return path.join(this.options.confdir, slug(id) + ".py");
	}
}

/**************************************************************************************//**
 * Opens a server socket to communicate with python module.
 ******************************************************************************************/
IcecastControl.prototype.open = function() {
	//Create a server socket
	var control = this;
	var port = this.options.socket.port;
	server = require('http').createServer();
	io = require('socket.io')(server);
	io.on('connection', function(socket) {
		socket.on('alive', function(data) {
			try {
				if (control.options.verbose) {
					console.log("[alive]", data.station);
				}
				
				if (!data.station) {
					throw new Error("Station id is missing!");
				}
				
				var station = control.stations[data.station];
				if (!data.token || station.info.token !== data.token) {
					socket.disconnect('unauthorized');
					throw new Error("Unauthorized!");
				}
				
				var result = 1;
				if (station.info.module && station.info.module.ices_init && typeof station.info.module.ices_init === "function") {
					result = station.info.module.ices_init();
				}
				
				if (result == 1) {
					socket.emit('alive');
				}
			}
			catch (e) {
				if (control.options.verbose) {
					console.error(e);
				}
			}
		});
		socket.on('next', function(data) {
			try {
				if (control.options.verbose) {
					console.log("[next]", data.station);
				}
			
				if (!data.station) {
					throw new Error("Station id is missing!");
				}
				
				var station = control.stations[data.station];
				if (!data.token || station.info.token !== data.token) {
					socket.disconnect('unauthorized');
					throw new Error("Unauthorized!");
				}
				
				var record = control.stations[data.station].getNextTrack();
				if (station.info.module && station.info.module.ices_get_next && typeof station.info.module.ices_get_next === "function") {
					record.file = station.info.module.ices_get_next();
				}
				if (station.info.module && station.info.module.ices_get_meta && typeof station.info.module.ices_get_meta === "function") {
					record.meta = station.info.module.ices_get_meta();
				}
				
				console.log(record);
				socket.emit('next', record);
			}
			catch (e) {
				if (control.options.verbose) {
					console.error(e);
				}
				socket.emit('next', { file: "", meta: "" });
			}
		});
		socket.on('shutdown', function(data) {
			try {
				if (control.options.verbose) {
					console.log("[shutdown]", data.station);
				}
				
				if (!data.station) {
					throw new Error("Station id is missing!");
				}
				
				var station = control.stations[data.station];
				if (!data.token || station.info.token !== data.token) {
					socket.disconnect('unauthorized');
					throw new Error("Unauthorized!");
				}
				
				if (station.info.module && station.info.module.ices_shutdown && typeof station.info.module.ices_shutdown === "function") {
					station.info.module.ices_shutdown();
				}
			}
			catch (e) {
				if (control.options.verbose) {
					console.error(e);
				}
			}
		});
		socket.on('disconnect', function() {
			//control.emit('disconnect', socket);
			if (control.options.verbose) {
				console.log("[Client disconnected]");
			}
		});
		
		if (control.options.verbose) {
			console.log("[Client connected]");
		}
	});
	server.listen(port);
	console.log("Socket listening at port " + port);
};

/**************************************************************************************//**
 * Closes the server socket.
 ******************************************************************************************/
IcecastControl.prototype.close = function() {
	io.close();
};

/**************************************************************************************//**
 * Generates .conf file and python module for the station.
 ******************************************************************************************/
IcecastControl.prototype.createStation = function(station) {
	var config = this.options;
	
	if (!station) {
		throw new Error("Station data is missing!");
	}
	
	if (!station.token) {
		station.token = guid();
	}

	//Generate .conf file
	var conf = fs.readFileSync(this.getGenericConfFile(), "utf8");
	conf = conf.replace("{MODULE}", slug(station.id));
	conf = conf.replace("{VERBOSE}", config.verbose ? "1" : "0");
	conf = conf.replace("{TEMPDIR}", config.tempdir || "/tmp");
	conf = conf.replace("{ICECAST.HOST}", config.icecast.host ||"localhost");
	conf = conf.replace("{ICECAST.PORT}", config.icecast.port || 8000);
	conf = conf.replace("{ICECAST.PASSWORD}", config.icecast.password);
	conf = conf.replace("{ICECAST.PROTOCOL}", config.icecast.protocol || "http");
	conf = conf.replace("{STATION.MOUNTPOINT}", station.mountpoint);
	conf = conf.replace("{STATION.NAME}", htmlencode(station.name));
	conf = conf.replace("{STATION.GENRE}", htmlencode(station.genre));
	conf = conf.replace("{STATION.DESCRIPTION}", htmlencode(station.description));
	conf = conf.replace("{STATION.URL}", htmlencode(station.url));
	conf = conf.replace("{STATION.PUBLIC}", station.yp ? "1" : "0");
	conf = conf.replace("{STATION.CROSSFADE}", station.crossfade || 1);
	conf = conf.replace("{CODEC.BITRATE}", station.bitrate || 128);
	conf = conf.replace("{CODEC.REENCODE}", station.reencode || 1);
	conf = conf.replace("{CODEC.CHANNELS}", station.channels || 2);
	if (station.samplerate > 0) {
		conf = conf.replace("<!--<Samplerate>44100</Samplerate>-->", station.samplerate);
	}
	fs.writeFileSync(this.getStationConfFile(station.id), conf);
	
	//Generate .py file
	var module = fs.readFileSync(this.getGenericModuleFile(), "utf8");
	module = module.replace("{STATION}", slug(station.id));
	module = module.replace("{VERBOSE}", config.verbose ? "True" : "False");
	module = module.replace("{HOST}", config.socket.host);
	module = module.replace("{PORT}", config.socket.port);
	module = module.replace("{TOKEN}", station.token);
	module = module.replace("{MESSAGE}", config.socket.message || "NOTE: This file is automatically generate and may be overwritten!");
	fs.writeFileSync(this.getStationModuleFile(station.id), module);
	
	//Create an IcecastStation instance to be able to access playlist
	var instance = new IcecastStation(this.options, station);
	this.stations[station.id] = instance;
	console.log("Station registered with token: " + station.token);
	return instance;
};

/**************************************************************************************//**
 * Removes station configuration files.
 ******************************************************************************************/
IcecastControl.prototype.removeStation = function(station) {
	//TODO: Stop the ices process if running
	
	delete this.stations[id];
	this.stations.splice(id, 1);
	
	if (fs.existsSync(this.getStationConfFile(station.id))) {
		fs.unlinkSync(this.getStationConfFile(station.id), conf);
	}
	
	if (fs.existsSync(this.getStationModuleFile(station.id))) {
		fs.unlinkSync(this.getStationModuleFile(station.id), module);
	}
};

/**************************************************************************************//**
 * Gets a station by id.
 ******************************************************************************************/
IcecastControl.prototype.station = function(id) {
	return this.stations[id];
};

module.exports = IcecastControl;
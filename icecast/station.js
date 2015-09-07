var fs = require('fs');
var path = require('path');
var Playlist = require('./playlist.js');

/**************************************************************************************//**
 * Constructor
 ******************************************************************************************/
function IcecastStation(config, station) {
	this.playlist = null;
	this.info = station;
	this.config = config;
}

/**************************************************************************************//**
 * Loads playlist
 ******************************************************************************************/
IcecastStation.prototype.load = function() {
	this.playlist = new Playlist();
	this.playlist.load(this.info.playlist);
	console.log("Found " + this.playlist.tracks.length + " tracks in playlist");
};

/**************************************************************************************//**
 * Starts the ices and playback.
 ******************************************************************************************/
IcecastStation.prototype.play = function() {
	var command = this.config.icescmd + ' -c "' + path.join(this.config.confdir, this.info.id + ".conf") + '"'; //TODO: getStationConfFile(this.info.id)
	console.log(command);
	
	var exec = require('child_process').exec;
    var proc = exec(command, { cwd: this.config.confdir });
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', function (chunk) {
        console.log(chunk);
    });
	proc.stderr.setEncoding('utf8');
    proc.stderr.on('data', function (chunk) {
        console.log(chunk);
    });
	proc.on('close', function (code) {
        console.log("ices exit with code " + code);
    });
};

/**************************************************************************************//**
 * Gets the next track from the playlist and increments the cursor by one.
 ******************************************************************************************/
IcecastStation.prototype.getNextTrack = function() {
	if (!this.playlist) {
		throw new Error("Playlist not loaded! Hint: call the load() function first.")
	}
	
	var track;
	var list = this.playlist.tracks;
	if (this.playlist.current) {
		//Find next track by file name
		var next = 0;
		for (var i = 0; i < list.length; i++) {
			if (list[i].file === this.playlist.current.file) {
				next = i + 1;
				if (next >= list.length) {
					next = 0;
				}
				track = list[next];
				break;
			}
		}
	}
	
	if (!track) {
		//Start with the first track
		track = list[0];
	}
	
	var record = { };
	record.file = track.file; //"path/to/track_" + index + ".mp3";
	record.meta = track.meta || ""; //"Track " + index;
	
	this.playlist.current = track;
	
	return record;
};

module.exports = IcecastStation;
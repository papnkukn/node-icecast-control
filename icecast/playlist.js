var fs = require('fs');
var path = require('path');

/**************************************************************************************//**
 * Constructor
 ******************************************************************************************/
function Playlist() {
	this.tracks = [ ];
	this.current = null;
}

/**************************************************************************************//**
 * Loads playlist from file
 ******************************************************************************************/
Playlist.prototype.load = function(file) {
	if (!file || !fs.existsSync(file)) {
		throw new Error("File not found: " + file);
	}

	var dir = path.dirname(file);
	var ext = path.extname(file).toLowerCase();
	switch (ext) {
		case ".txt":
			var txt = fs.readFileSync(file, "utf8");
			this.tracks = this.parseTXT(txt, dir);
			break;
			
		case ".m3u":
			var m3u = fs.readFileSync(file, "utf8");
			this.tracks = this.parseM3U(m3u, dir);
			break;
			
		default:
			throw new Error("Playlist type not supported: " + ext);
	}
	
	return this.tracks;
};

/**************************************************************************************//**
 * Gets the number of tracks in the playlist.
 ******************************************************************************************/
Playlist.prototype.length = function() {
	return this.tracks ? this.tracks.length : 0;
};

/**************************************************************************************//**
 * Parses plain text playlist, i.e. each file on new line
 * @param txt {string} Plain text playlist as string (not filename)
 * @param dir {string} Base directory to resolve absolute path of tracks
 * @return Returns a list of tracks, e.g. [{ file: ..., meta: ... }]
 ******************************************************************************************/
Playlist.prototype.parseTXT = function(txt, dir) {
	var list = [ ];
	
	var item = { };
	var lines = txt.split(/\r\n/g);
	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];
		
		var mp3file = path.join(dir, line);
		if (fs.existsSync(mp3file)) {
			item.file = mp3file;
			item.meta = path.basename(mp3file);
			list.push(item);
		}
		else {
			//console.log(mp3file + " not found");
		}
		
		item = { };
	}
	
	return list;
}

/**************************************************************************************//**
 * Parses M3U playlist.
 * @param m3u {string} M3U playlist as string (not filename)
 * @param dir {string} Base directory to resolve absolute path of tracks
 * @return Returns a list of tracks, e.g. [{ duration: ..., file: ..., meta: ... }]
 ******************************************************************************************/
Playlist.prototype.parseM3U = function(m3u, dir) {
	var list = [ ];
	var ism3u = false;
	
	var item = { };
	var lines = m3u.split(/\r\n/g);
	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];
		
		var match = /^#EXTM3U/g.exec(line);
		if (match) {
			ism3u = true;
			continue;
		}
		
		match = /^#EXTINF:(\-?\d+),(.*)/g.exec(line);
		if (match) {
			item.duration = parseInt(match[1]);
			item.meta = match[2];
			continue;
		}
		
		match = /^#.*/g.exec(line);
		if (match) {
			//Ignore comment
			continue;
		}
		
		var mp3file = path.join(dir, line);
		if (fs.existsSync(mp3file)) {
			item.file = mp3file;
			list.push(item);
		}
		else {
			//console.log(mp3file + " not found");
		}
		
		item = { };
	}
	
	return list;
}

module.exports = Playlist;
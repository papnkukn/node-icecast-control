var IcecastControl = require("./icecast/control.js");

var options = {
	verbose: false,
	confdir: "/etc/icecast/conf.d", //Directory to store auto-generated .conf and .py file, NOTE: the directory must exist and have write permissions
	tempdir: "/tmp/icecast",        //Directory for temporary files, NOTE: the directory must exist
	icescmd: "ices",                //"ices" or "ices0" or other shell command
	socket: {
		host: "localhost",          //Server socket host
		port: 3020                  //Server socket port to be open by node.js
	},
	icecast: {
		host: "localhost",          //Socket host of the icecast
		port: 8000,                 //Socket port of the icecast
		user: "admin",
		password: "myicecastpwd39"
	}
};

var station = {
	id: "evergreen",                              //This will be file name, only ASCII number and letters allowed
	name: "Evergreen songs",                      //Human readable station title
	genre: "Evergreen",                           //Genre
	description: "Good old songs",                //Description of the station
	mountpoint: "/evergreen",                     //Stream will be available at http://localhost:8000/evergreen
	url: "http://radio-info-website-goes-here/",  //Website providing information about the station
	playlist: "/path/to/music/playlist.m3u",      //Static playlist, if you want to control the playlist see the "module" property
	yp: false                                     //Publish to yp directory
	/*
	module: {
		ices_init: function() { return 1; }, //1..succes, 0..failed
		ices_shutdown: function() { console.log("ices_shutdown"); },
		ices_get_next: function() { return "/path/to/track.mp3"; },
		ices_get_metadata: function() { return "Author - Track (Album, Year)"; }
	}
	*/
};
	
var ic = new IcecastControl(options);
var is = ic.createStation(station);
ic.open(); //Open server socket
is.load(); //Load playlist
is.play(); //Start ices
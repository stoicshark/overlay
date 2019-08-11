"use_strict";

function Player(data) {	
	this.name = data['name'];
	this.dispname = data['name'];
	this.job = data['Job'].toLowerCase();
	this.dps = 0.00;
	this.dpsbase = 0;
	this.dpsdec = "00";
	this.dpspct = "0%";
	this.dpsbar = "0%";
	this.crit = "0%";
	this.dhit = "0%";
	this.critdhit = "0%";
	this.deaths = 0;
	this.maxhit = "";
	this.maxhitnum = "";
	this.maxhitcurr = 0;
	this.displaymaxhit = false;
	this.displaycrit = false;
	this.crithits = 0;
	this.state = "initialize";
	this.dpsGraph = [0];
	this.divID = 0;
	this.divRGBA = "";
	this.role = Player.getRole(this.name, this.job);
}

Player.prototype.update = function (data) {
	for (var player in data) {
		if (this.name == data[player]['name']) {
			var d = data[player];
			if (!isNaN(d['encdps'])) {
				this.dps = d['encdps'];
				//this.dpsGraph.push(parseFloat(this.dps));
				var dpsarr = this.dps.split(".");
				this.dpsbase = dpsarr[0];
				this.dpsdec = dpsarr[1];
			}
			
			this.crit = d['crithit%'];
			this.dhit = d['DirectHitPct'];
			this.critdhit = d['CritDirectHitPct'];
			
			// Has there been a death?
			if (parseInt(d['deaths']) > this.deaths) {
				this.deaths = d['deaths'];
				this.state = "dead";
			}
			
			// Has there been more crits?
			if (parseInt(d['crithits']) > this.crithits) {
				this.crithits = d['crithits'];
				this.displaycrit = true;
			}
			
			// Last 10 combined hits should make a more accurate graph
			if (!isNaN(d['Last10DPS'])) {
				this.dpsGraph.push(parseFloat(d['Last10DPS']));
			}
			
			var shortenMaxhit = [
				// Shorten some ability names
				["Midare Setsugekka", "Mid. Setsugekka"],
				["Kaeshi Setsugekka", "Kae. Setsugekka"],
				["The Forbidden Chakra", "Forb. Chakra"],
				["Six Sided Star", "6 Sided Star"],
				["Spineshatter Dive", "Spine. Dive"],
				["Refulgent Arrow", "Ref. Arrow"],
				["Enchanted Redoublement", "E. Redoublement"],
				["Single Technical Finish", "1x Tech. Finish"],
				["Double Technical Finish", "2x Tech. Finish"],
				["Triple Technical Finish", "3x Tech. Finish"],
				["Quadruple Technical Finish", "4x Tech. Finish"],
				["Single Standard Finish", "1x Stnd. Finish"],
				["Double Standard Finish", "2x Stnd. Finish"],
				// Trust abilities
				["Fire Iv Of The Seventh Dawn", "Fire IV (OtSD)"],
				["Blizzard Of The Seventh Dawn", "Blizzard (OtSD)"],
				["Blizzard Iv Of The Seventh Dawn", "Blizzard IV (OtSD)"],
				["Aero Of The Seventh Dawn", "Aero (OtSD)"],
				["Foul Of The Seventh Dawn", "Foul (OtSD)"],
				["Gravity Of The Seventh Dawn", "Gravity (OtSD)"],
				["Thunder Of The Seventh Dawn", "Thunder (OtSD)"],
				["", ""]
			];
			
			if (d['maxhit'] != "0") {
				var maxhitarr = d['maxhit'].split("-");
				if (maxhitarr[0] != "Attack" && maxhitarr[0] != "Shot") {
					this.maxhit = maxhitarr[0];
					for (var i = 0; i < shortenMaxhit.length; i++) {
						if (this.maxhit == shortenMaxhit[i][0]) this.maxhit =  shortenMaxhit[i][1];
					}
					this.maxhitnum = maxhitarr[1];
					
					// Is this the new max hit?
					if (parseInt(this.maxhitnum) > parseInt(this.maxhitcurr)) {
						this.displaymaxhit = true;
						this.maxhitcurr = maxhitarr[1];
					}
				}
			}
		}
	}
}

Player.isValid =  function (entry) {
	var name = entry['name'];
	var job = entry['Job'].toLowerCase();
	// Valid if there's any job
	if (job !== "") return true;
	// Valid if it's a chocobo
	if (name.indexOf("(") > -1) return true;
	// Valid if Limit Break
	if (name == "Limit Break" && entry['encdps'] > 0) return true;
	
	// Otherwise this might be some other data, maybe.
	return false;
}

Player.getRole = function (name, job) {
	var dps = ["pgl", "mnk", "lnc", "drg", "arc", "brd", "rog", "nin", "acn", "smn", "thm", "blm", "mch", "rdm", "sam", "blu", "dnc"];
	var tank = ["gla", "pld", "mrd", "war", "drk", "gnb"];
	var healer = ["cnj", "whm", "sch", "ast"];
	var crafter = [];
	var gatherer = [];
	
	// Does this entry have a job?
	if (job !== "") {
		if (dps.indexOf(job) > -1) return "dps";
		if (tank.indexOf(job) > -1) return "tank";
		if (healer.indexOf(job) > -1) return "healer";
	}
	if (name.indexOf("(") > -1) return "pet";
	if (name == "Limit Break") return "limit break";
	return "none";
}
function Player(data , dconfig) {	
	this.config = dconfig;
	this.name = data['name'];
	this.name1 = data['name'];
	this.name2 = data['name'];
	if (this.name == this.config.detectYou) {
		this.dispname = this.config.overrideYou;
	} else {
		this.dispname = data['name'];
	}
	this.job = data['Job'].toLowerCase();
	this.dps = 0.00;
	this.dpsbase = 0;
	this.dpsdec = "00";
	this.dpspct = "0%";
	this.dpsbar = "0%";
	this.damage = 0;
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
	this.dhits = 0;
	this.critdhits = 0;
	this.state = "initialize";
	this.stopGraph = false;
	this.dpsGraph = [0];
	this.dpsLabel = [0];
	this.dpsTick = 1;
	this.divID = 0;
	this.divRGBA = "";
	this.role = Player.getRole(this.name, this.job);
	this.jobname = Player.getJobName(this.job, this.role);
	this.top8 = true;
	this.owner = "";
	this.hps = 0;
	this.healed = 0;
	this.blockpct = "0%";
	this.parrypct = "0%";
	this.damagepct = "0%"
	this.damagetaken = 0;
	
	if (this.role == 'pet') {
		var petname = this.dispname.split(" (");
		this.dispname = petname[0];
		petname = petname[1].slice(0, -1);
		this.owner = petname;
		this.name1 = this.dispname;
		this.name2 = this.dispname.charAt(0) + '.';
	} else {
		try {
			var namearr = this.dispname.split(" ");
			this.name1 = namearr[0] + ' ' + namearr[1].charAt(0) + '.';
			this.name2 = namearr[0].charAt(0) + '. ' + namearr[1].charAt(0) + '.';
		} catch (e) {
			// throw
		}
	}
}

Player.prototype.update = function (data) {
	for (var player in data) {
		if (this.name == data[player]['name']) {
			var d = data[player];
			if (!isNaN(d['encdps'])) {
				this.dps = d['encdps'];
				this.damage = d['damage'];
				var dpsarr = this.dps.split(".");
				if (!isNaN(dpsarr[0])) {
					this.dpsbase = dpsarr[0];
				} else {
					this.dpsbase = 0;
				}
				if (!isNaN(dpsarr[1])) {
					this.dpsdec = dpsarr[1];
				} else {
					this.dpsdec = '00';
				}
			}
			
			if (!isNaN(d['ENCHPS'])) this.hps = d['ENCHPS'];
			if (!isNaN(d['healed'])) this.healed = d['healed'];
			
			this.crit = d['crithit%'];
			this.dhit = d['DirectHitPct'];
			this.critdhit = d['CritDirectHitPct'];
			this.dhits = d['DirectHitCount'];
			this.critdhits = d['CritDirectHitCount'];
			this.blockpct = d['BlockPct'];
			this.parrypct = d['ParryPct'];
			this.damagepct = d['damage%'];
			this.damagetaken = d['damagetaken'];
			
			// Has there been a death?
			if (parseInt(d['deaths']) > this.deaths) {
				this.deaths = d['deaths'];
				if (this.state == 'alive') this.state = 'dead';
			}
			
			// Has there been more crits?
			if (parseInt(d['crithits']) > this.crithits) {
				this.crithits = d['crithits'];
				this.displaycrit = true;
			}
			// Last 10 combined hits should make a more accurate graph
			if (config.enableGraph && this.dpsTick == config.graphTick && !this.stopGraph) {
				this.dpsTick = 1;
				if (!isNaN(d['Last10DPS']) && parseFloat(d['Last10DPS']) > -1) {
					this.dpsGraph.push(parseFloat(d['Last10DPS']));
				} else {
					this.dpsGraph.push(parseFloat(0.00));
				}
				this.dpsLabel.push(this.dpsLabel.length);
			} else {
				this.dpsTick = this.dpsTick + 1;
			}
			
			//###############
			var shortenMaxhit = [
				// Shorten some ability names
				["Midare Setsugekka", "Mid. Setsugekka"],
				["Kaeshi Setsugekka", "Kae. Setsugekka"],
				["The Forbidden Chakra", "Forb. Chakra"],
				["Six Sided Star", "6 Sided Star"],
				["Spineshatter Dive", "Spine. Dive"],
				["Refulgent Arrow", "Ref. Arrow"],
				["Enchanted Redoublement", "E. Redoublement"],
				["Heated Split Shot", "H. Split Shot"],
				["Heated Slug Shot", "H. Slug Shot"],
				["Heated Clean Shot", "H. Clean Shot"],
				["Single Technical Finish", "1x Tech. Finish"],
				["Double Technical Finish", "2x Tech. Finish"],
				["Triple Technical Finish", "3x Tech. Finish"],
				["Quadruple Technical Finish", "4x Tech. Finish"],
				["Single Standard Finish", "1x Stnd. Finish"],
				["Double Standard Finish", "2x Stnd. Finish"],
				["", ""]
			];
			
			if (d['maxhit'] != "0") {
				var maxhitarr = d['maxhit'].split("-");
				if (maxhitarr[0] != "Attack" && maxhitarr[0] != "Shot") {
					// Is this the new max hit?
					if (parseInt(maxhitarr[1]) > parseInt(this.maxhitcurr)) {
						this.maxhit = maxhitarr[0];
						this.maxhitnum = maxhitarr[1];
						for (var i = 0; i < shortenMaxhit.length; i++) {
							if (this.maxhit == shortenMaxhit[i][0]) this.maxhit =  shortenMaxhit[i][1];
						}
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
	var dps = ["pgl", "mnk", "lnc", "drg", "arc", "brd", "rog", "nin", "acn", "smn", "thm", "blm", "mch", "rdm", "sam", "blu", "dnc", "rpr"];
	var tank = ["gla", "pld", "mrd", "war", "drk", "gnb"];
	var healer = ["cnj", "whm", "sch", "ast", "sge"];
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

Player.getJobName = function (job, role) {
	var jobnames = [
		["pgl","pugilist"],
		["mnk","monk"],
		["lnc","lancer"],
		["drg","dragoon"],
		["arc","archer"],
		["brd","bard"],
		["rog","rogue"],
		["nin","ninja"],
		["acn","arcanist"],
		["smn","summoner"],
		["thm","thaumaturge"],
		["blm","black mage"],
		["mch","machinist"],
		["rdm","red mage"],
		["sam","samurai"],
		["blu","blue mage"],
		["dnc","dancer"],
		["rpr","reaper"],
		["gla","gladiator"],
		["pld","paladin"],
		["mrd","marauder"],
		["war","warrior"],
		["drk","dark knight"],
		["gnb","gunbreaker"],
		["cnj","conjurer"],
		["whm","white mage"],
		["sch","scholar"],
		["ast","astrologian"],
		["sge","sage"],
	];
	if (job !== "") {
		for (var j in jobnames) {
			if (jobnames[j][0] == job) {
				return jobnames[j][1];
			}
		}
	} else {
		if (role == 'pet') {
			return 'chocobo'; 
		}
		if (role == 'limit break') {
			return 'limit break'; 
		}
	}
	return "";
}

Player.getStat = function(entry, player = null) {
	var options = [
			'DPS',
			'HPS',
			'Maximum Hit',
			'Deaths',
			'Critical%',
			'Direct Hit%',
			'Crit Direct Hit%',
			'Blocked%',
			'Parried%',
			'Damage Taken'
		];
		
	var doptions = [
			['DPS', 'DPS'],
			['HPS', 'HPS'],
			['Maximum Hit', 'MAXHIT'],
			['Deaths', 'DEATHS'],
			['Critical%', 'CRIT'],
			['Direct Hit%', 'DHIT'],
			['Crit Direct Hit%', '! ! !'],
			['Blocked%', 'BLOCK'],
			['Parried%', 'PARRY'],
			['Damage Taken', 'DMG']
		];
		
	if (entry == 'options') return options;
	if (entry == 'display') return doptions;
	
	switch (entry) {
		case 'DPS':
			return player.dpsbase
		case 'HPS':
			return player.hps;
		case 'MAXHIT':
			return player.maxhitnum;
		case 'DEATHS':
			return player.deaths;
		case 'CRIT':
			return player.crit;
		case 'DHIT':
			return player.dhit;
		case '! ! !':
			return player.critdhit;
		case 'BLOCK':
			return player.blockpct;
		case 'PARRY':
			return player.parrypct;
		case 'DMG':
			return player.damage;
		default:
			return '';
	}
	return stat;
}


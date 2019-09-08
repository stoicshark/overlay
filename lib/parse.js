"use_strict";

const NICK_REGEX = / \(([\uac00-\ud7a3']{1,9}|[A-Z][a-z' ]{0,15})\)$/
const toArray = o => Object.keys(o).map(_ => o[_])
const SORTABLE = {}

// Data
function Data(data) {
	this.update(data);
}

Data.prototype.update = function(data) {
	this.isActive = data.isActive;
	if (this.isActive == 'true') { // What the hell.
		this.overlayPlugin = true;
		this.isActive = true;
	} else if (this.isActive == 'false') {
		this.isActive = false;
		this.overlayPlugin = true;
	}
	
	this.Encounter = data.Encounter;
	this.Combatant = toArray(data.Combatant);
}

// Encounter
function Encounter(config) {
	this.players = [];
	this.topDamage = 0;
	this.totalDpsGraph = [0];
	this.totalDpsLabel = [0];
}
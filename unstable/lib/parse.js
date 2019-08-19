"use_strict";

const NICK_REGEX = / \(([\uac00-\ud7a3']{1,9}|[A-Z][a-z' ]{0,15})\)$/
const toArray = o => Object.keys(o).map(_ => o[_])
const SORTABLE = {}

function Data(data) {
	console.log(data);
	this.update(data);
}

Data.prototype.update = function(data) {
	this.isActive = data.isActive;
	this.Encounter = data.Encounter;
	this.Combatant = toArray(data.Combatant);
}
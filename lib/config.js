"use_strict";

function Config() {	
	// Player container RGBA
	this.alphaRGBA = '0.3';
	this.dpsRGBA = 'rgba(190, 50, 120, ' + this.alphaRGBA + ')';
	this.tankRGBA = 'rgba(50, 80, 255, ' + this.alphaRGBA + ')';
	this.healerRGBA = 'rgba(80, 185, 155, ' + this.alphaRGBA + ')';
	this.limitRGBA = 'rgba(200, 200, 100, ' + this.alphaRGBA + ')';
	this.defaultRGBA = 'rgba(200, 200, 200, ' + this.alphaRGBA + ')';
	
	// Style debug
	this.playerFill = false;
	this.graphFill = true;
	this.hideMenu = true;
	
	// Layout debug
	this.layoutVertical = true;
	this.layoutHorizontal = true;
	
	// Effects debug
	this.showMaxhits = true;
	this.deathColor = true;
	this.deathShake = true;
	this.deathBlood = true;
	this.critBlip = true;
}

Config.prototype.update = function (d) {
	if (typeof d.alphaRGBA !== 'undefined') this.alphaRGBA = d.alphaRGBA;
	if (typeof d.dpsRGBA !== 'undefined') this.dpsRGBA = d.dpsRGBA;
	if (typeof d.tankRGBA !== 'undefined') this.tankRGBA = d.tankRGBA;
	if (typeof d.healerRGBA !== 'undefined') this.healerRGBA = d.healerRGBA;
	if (typeof d.limitRGBA !== 'undefined') this.limitRGBA = d.limitRGBA;
	if (typeof d.defaultRGBA !== 'undefined') this.defaultRGBA = d.defaultRGBA;
	
	if (typeof d.playerFill !== 'undefined') this.playerFill = d.playerFill;
	if (typeof d.graphFill !== 'undefined') this.graphFill = d.graphFill;
	if (typeof d.hideMenu !== 'undefined') this.hideMenu = d.hideMenu;
	
	if (typeof d.layoutVertical !== 'undefined') this.layoutVertical = d.layoutVertical;
	if (typeof d.layoutHorizontal !== 'undefined') this.layoutHorizontal = d.layoutHorizontal;
	
	if (typeof d.showMaxhits !== 'undefined') this.showMaxhits = d.showMaxhits;
	if (typeof d.deathColor !== 'undefined') this.deathColor = d.deathColor;
	if (typeof d.deathShake !== 'undefined') this.deathShake = d.deathShake;
	if (typeof d.deathBlood !== 'undefined') this.deathBlood = d.deathBlood;
	if (typeof d.critBlip !== 'undefined') this.critBlip = d.critBlip;
	
	//if (typeof d. !== 'undefined') this. = d.;
}
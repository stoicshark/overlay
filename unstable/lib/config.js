function Config() {	
	// Player container Color
	this.playerAlpha = '0.3';
	this.youRGBA = 'rgba(200, 200, 200, 0.3)';
	this.dpsRGBA = 'rgba(190, 50, 120, 0.3)';
	this.tankRGBA = 'rgba(50, 80, 255, 0.3)';
	this.healerRGBA = 'rgba(80, 185, 155, 0.3)';
	this.limitRGBA = 'rgba(200, 200, 100, 0.3)';
	this.defaultRGBA = 'rgba(200, 200, 200, 0.3)';
	this.youRGBA_ = 'rgba(200, 200, 200, 0.3)';
	this.dpsRGBA_ = 'rgba(190, 50, 120, 0.3)';
	this.tankRGBA_ = 'rgba(50, 80, 255, 0.3)';
	this.healerRGBA_ = 'rgba(80, 185, 155, 0.3)';
	this.limitRGBA_ = 'rgba(200, 200, 100, 0.3)';
	this.defaultRGBA_ = 'rgba(200, 200, 200, 0.3)';
	this.youRGBA__ = 'rgba(0, 0, 0, 0.3)';
	this.dpsRGBA__ = 'rgba(0, 0, 0, 0.3)';
	this.tankRGBA__ = 'rgba(0, 0, 0, 0.3)';
	this.healerRGBA__ = 'rgba(0, 0, 0, 0.3)';
	this.limitRGBA__ = 'rgba(0, 0, 0, 0.3)';
	this.defaultRGBA__ = 'rgba(0, 0, 0, 0.3)';
	this.playerTextColor = 'rgb(255, 255, 255)';
	this.playerDPSColor = 'rgb(255, 255, 255)';
	
	// Info container color
	this.infoAlpha = '0.3';
	this.infoColor = 'rgba(0, 0, 0, 0.3)';
	this.infoTextColor = 'rgba(255, 255, 255)';
	
	// Graph container color
	this.graphAlpha = '0.3';
	this.graphColor = 'rgba(0, 0, 0, 0.3)';
	this.graphLineColor = 'rgba(0, 0, 0, 0.3)';
	this.graphFillColor = 'rgba(255, 255, 255, 0.3)';
	this.graphTextColor =  'rgba(255, 255, 255)';
	
	// General/Style settings
	this.enableRaid24 = true;
	this.showLb = true;
	this.playerFill = false;
	this.graphFill = true;
	this.hideMenu = true;
	this.enableYouColor = false;
	this.detectYou = 'YOU';
	this.overrideYou = 'YOU';
	
	// Graph settings
	this.enableGraph = true;
	this.enableGraph24 = false;
	this.graphTick = 3;
	this.graphTrack = 'Yourself';
	
	// Layout settings
	this.layoutVertical = true;
	this.layoutHorizontal = true;
	
	// Effects settings
	this.showMaxhits = true;
	this.deathColor = true;
	this.deathShake = true;
	this.deathBlood = true;
	this.critBlip = true;
	
	// Easter Eggs
	this.eToasty = false;
}

Config.prototype.update = function (d) {
	if (typeof d.playerAlpha !== 'undefined') this.playerAlpha = d.playerAlpha;
	if (typeof d.youRGBA !== 'undefined') this.youRGBA = d.youRGBA;
	if (typeof d.dpsRGBA !== 'undefined') this.dpsRGBA = d.dpsRGBA;
	if (typeof d.tankRGBA !== 'undefined') this.tankRGBA = d.tankRGBA;
	if (typeof d.healerRGBA !== 'undefined') this.healerRGBA = d.healerRGBA;
	if (typeof d.limitRGBA !== 'undefined') this.limitRGBA = d.limitRGBA;
	if (typeof d.defaultRGBA !== 'undefined') this.defaultRGBA = d.defaultRGBA;
	if (typeof d.youRGBA_ !== 'undefined') this.youRGBA_ = d.youRGBA_;
	if (typeof d.dpsRGBA_ !== 'undefined') this.dpsRGBA_ = d.dpsRGBA_;
	if (typeof d.tankRGBA_ !== 'undefined') this.tankRGBA_ = d.tankRGBA_;
	if (typeof d.healerRGBA_ !== 'undefined') this.healerRGBA_ = d.healerRGBA_;
	if (typeof d.limitRGBA_ !== 'undefined') this.limitRGBA_ = d.limitRGBA_;
	if (typeof d.defaultRGBA_ !== 'undefined') this.defaultRGBA_ = d.defaultRGBA_;
	if (typeof d.youRGBA__ !== 'undefined') this.youRGBA__ = d.youRGBA__;
	if (typeof d.dpsRGBA__ !== 'undefined') this.dpsRGBA__ = d.dpsRGBA__;
	if (typeof d.tankRGBA__ !== 'undefined') this.tankRGBA__ = d.tankRGBA__;
	if (typeof d.healerRGBA__ !== 'undefined') this.healerRGBA__ = d.healerRGBA__;
	if (typeof d.limitRGBA__ !== 'undefined') this.limitRGBA__ = d.limitRGBA__;
	if (typeof d.defaultRGBA__ !== 'undefined') this.defaultRGBA__ = d.defaultRGBA__;
	if (typeof d.playerTextColor !== 'undefined') this.playerTextColor = d.playerTextColor;
	if (typeof d.playerDPSColor !== 'undefined') this.playerDPSColor = d.playerDPSColor;
	
	if (typeof d.infoAlpha !== 'undefined') this.infoAlpha = d.infoAlpha;
	if (typeof d.infoColor !== 'undefined') this.infoColor = d.infoColor;
	if (typeof d.infoTextColor !== 'undefined') this.infoTextColor = d.infoTextColor;
	
	if (typeof d.graphAlpha !== 'undefined') this.graphAlpha = d.graphAlpha;
	if (typeof d.graphColor !== 'undefined') this.graphColor = d.graphColor;
	if (typeof d.graphLineColor !== 'undefined') this.graphLineColor = d.graphLineColor;
	if (typeof d.graphFillColor !== 'undefined') this.graphFillColor = d.graphFillColor;
	if (typeof d.graphTextColor !== 'undefined') this.graphTextColor = d.graphTextColor;
	
	if (typeof d.enableRaid24 !== 'undefined') this.enableRaid24 = d.enableRaid24;
	if (typeof d.showLb !== 'undefined') this.showLb = d.showLb;
	if (typeof d.playerFill !== 'undefined') this.playerFill = d.playerFill;
	if (typeof d.graphFill !== 'undefined') this.graphFill = d.graphFill;
	if (typeof d.hideMenu !== 'undefined') this.hideMenu = d.hideMenu;
	if (typeof d.enableYouColor !== 'undefined') this.enableYouColor = d.enableYouColor;
	if (typeof d.detectYou !== 'undefined') this.detectYou = d.detectYou;
	if (typeof d.overrideYou !== 'undefined') this.overrideYou = d.overrideYou;
	
	if (typeof d.enableGraph !== 'undefined') this.enableGraph = d.enableGraph;
	if (typeof d.enableGraph24 !== 'undefined') this.enableGraph24 = d.enableGraph24;
	if (typeof d.graphTick !== 'undefined') this.graphTick = d.graphTick;
	if (typeof d.graphTrack !== 'undefined') this.graphTrack = d.graphTrack;
	
	if (typeof d.layoutVertical !== 'undefined') this.layoutVertical = d.layoutVertical;
	if (typeof d.layoutHorizontal !== 'undefined') this.layoutHorizontal = d.layoutHorizontal;
	
	if (typeof d.showMaxhits !== 'undefined') this.showMaxhits = d.showMaxhits;
	if (typeof d.deathColor !== 'undefined') this.deathColor = d.deathColor;
	if (typeof d.deathShake !== 'undefined') this.deathShake = d.deathShake;
	if (typeof d.deathBlood !== 'undefined') this.deathBlood = d.deathBlood;
	if (typeof d.critBlip !== 'undefined') this.critBlip = d.critBlip;
	
	if (typeof d.eToasty !== 'undefined') this.eToasty = d.eToasty;
	
	//if (typeof d. !== 'undefined') this. = d.;
}
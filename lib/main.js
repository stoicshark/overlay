'use strict';
Chart.defaults.global.animation.duration = 500;
var theme = "thresher";

// Config things
var config = new Config();
try {
	// Is there a saved config?
	if (localStorage.getItem('config') === null) {
		localStorage.setItem('config', JSON.stringify(config)); // There you go
	} else {
		var parseConfig = JSON.parse(localStorage.getItem('config'));
		config.update(parseConfig); // Populate the current config with saved values
		localStorage.setItem('config', JSON.stringify(config)); // Save everything in case there's something new
	}
} catch (e) {
	var config = new Config();
	localStorage.setItem('config', JSON.stringify(config)); // There you go
}

// Check if configuration is saved
localStorage.setItem('config-saved', false);
setInterval(function(){	
	if (localStorage.getItem('config-saved') == "true") {
		location.reload(); // Hard reload the parser - for now
	}
}, 500);

let updates = true;
let players = [];
let activeGate = false;
let topDamage = 0;
let totalDpsGraph = [0];
let totalDpsLabel = [0];
let totalDpsTick = 1;
let totalTick = 0;
let currentTrack = '';
let raid24 = false;
if (config.graphTrack == 'Yourself') currentTrack = config.detectYou;

// Toasty?
let eToasty = 0;
let eToastyTimer;
let eToastyTimerAlive;
function funcToasty(mode) {
	if (!mode) {
		clearInterval(eToastyTimer);
		eToastyTimerAlive = false;
		var tdeath = 3;
		if (raid24) tdeath = 7;
		if (eToasty > tdeath) {
			var dotoasty = document.getElementById("toasty-ogg");
			dotoasty.volume = 0.6;
			dotoasty.play();
			
			let toastydiv = document.createElement("div");
			toastydiv.setAttribute('id', 'toasty');
		
			if (config.layoutHorizontal) {
				toastydiv.style.transform = 'scaleX(-1)';
				toastydiv.style.left = '-100';
				document.getElementById('main').appendChild(toastydiv);
				var tl = new TimelineMax();
				tl.add(TweenMax.to(toasty, 0.3, { left: '0'}));
				tl.add(TweenMax.to(toasty, 0.3, { left: '-100%', delay: '1' }));
			} else {
				toastydiv.style.right = '-100';
				document.getElementById('main').appendChild(toastydiv);
				var tl = new TimelineMax();
				tl.add(TweenMax.to(toasty, 0.3, { right: '0'}));
				tl.add(TweenMax.to(toasty, 0.3, { right: '-100%', delay: '1' }));
			}
			setTimeout(function(){
				$(toasty, this).remove();
			}, 2000);
		}
		eToasty = 0;
	} else {
		if (!eToastyTimerAlive) {
			eToastyTimer = setTimeout(funcToasty, 5000);
			eToastyTimerAlive = true;
		}
	}
}

// Zoom?
document.body.style.transform = 'perspective(1px) scale(' + config.overlayZoom + ')';

// Create a graph
var ctx = document.getElementById('graph').getContext('2d');
var graphCanvas = new Chart(ctx, 
	{
		type: 'line',
		data: {
			labels: [],
			datasets: [{
				data: [],
				backgroundColor: config.graphFillColor,
				borderColor: config.graphLineColor,
				borderWidth: 2
			}]
		},
		options:{
			responsive: true,
			maintainAspectRatio: false,
			elements: {
				line: {
					tension: 0
				},
				point:{
					radius: 0
				}
			},
			legend: {
				display: false
			},
			scales: {
				xAxes: [{
					display: false
				}],
				yAxes: [{
					display: false
				}]
			},
			tooltips: {
				 enabled: false
			},
			hover: {
				mode: null
			}
		}
	}
);

// Initial setup

// Container background and text colors
document.getElementById('legend').style.color = config.infoTextColor;
document.getElementById('legend').style.backgroundColor = config.infoColor;

document.getElementById('graph-html').style.color = config.graphTextColor;
document.getElementById('graph-cont').style.backgroundColor = config.graphColor;
document.getElementById('more').style.color = config.graphTextColor;
document.getElementById('menu').style.backgroundColor = config.graphColor;

// Should containers fill the main window?
if (config.graphFill) {
	document.getElementById('header').style.width = '100%';
} else {
	document.getElementById('header').style.width = 'calc(100% - 100px)';
}
if (config.playerFill) {
	document.getElementById('legend').style.width = '100%';
	document.getElementById('updates-html').style.width = 'calc(100% - 10px)';
} else {
	document.getElementById('legend').style.width = 'calc(100% - 100px)';
	document.getElementById('updates-html').style.width = 'calc(100% - 110px)';
}

// Vertical and horizontal layout setup
if (config.layoutVertical) {
	document.getElementById('header').style.top = '0';
	document.getElementById('legend').style.top = '53';
	document.getElementById('main').style.top = '68';
	document.getElementById('updates-html').style.top = '71';
} else {
	document.getElementById('header').style.bottom = '0';
	document.getElementById('legend').style.bottom = '53';
	document.getElementById('main').style.bottom = '68';
	document.getElementById('updates-html').style.bottom = '71';
}

if (config.layoutHorizontal) {
	document.getElementById('header').style.left = '0';
	document.getElementById('legend').style.left = '0';
	document.getElementById('main').style.left = '0';
	document.getElementById('updates-html').style.left = '0';
} else {
	document.getElementById('header').style.right = '0';
	document.getElementById('legend').style.right = '0';
	document.getElementById('main').style.right = '0';
	document.getElementById('updates-html').style.right = '0';
}

// Create menu
let settingsWin = null;
$('#menu').click(function(){
	settingsWin = window.open('settings.html', 'oWin', 'width=700, height=400,  resizable=no');
});

// Event listener from ACT
document.addEventListener("onOverlayDataUpdate", function (e) {
	update(e.detail);
});

// UPDATE
var debug = '';
function update(rawdata) {
	var data = new Data(rawdata);
	debug = data;
	
	// OverlayPlugin or WebSocket, this is a poor hack/work around
	if (data.overlayPlugin) {
		try {
			clearTimeout(WebSocketTimeout); // Forceful Stop
		} catch (e) {
			// Older OverlayPlugin versions have issues with ACTWebSocket syntax.
			// This leads to this timer never being defined so I'm throwing it away
			// with a try and catch until it becomes a problem. Oh well.
		}
	}
	
	// Update legend data
	var ele = document.getElementById('legend');
	var legendhtml = "";
	legendhtml += '<span class="span-absolute" style="left: 2; top: 1;">DPS</span>';
	legendhtml += '<span class="span-absolute" style="left: 25%; margin-left: 3px; top: 1;">CRIT</span>';
	legendhtml += '<span class="span-absolute" style="left: 40%; margin-left: 3px; top: 1;">DHIT</span>';
	legendhtml += '<span class="span-absolute" style="left: 55%; margin-left: 3px; top: 1;">!!!</span>';
	legendhtml += '<span class="span-absolute" style="left: 70%; margin-left: 3px; top: 1;">DEATHS</span>';
	legendhtml += '<span class="span-absolute" style="right: 2; margin-left: 3px; top: 1; text-align: right;">MAXHIT</span>';
	ele.innerHTML = legendhtml;
	
	// Update encounter data
	var ele = document.getElementById('graph-html');
	var graphhtml = "";
	var encounterDPS = 0;
	if (!isNaN(data.Encounter['dps'])) {
		encounterDPS = data.Encounter['dps'];
	}
	graphhtml += '<span class="span-absolute info-totaldps" style="left: 2; top: 0;">Total DPS: ' + encounterDPS + '</span>';
	graphhtml += '<span class="span-absolute info-time" style="left: 2; bottom: 0;">Time: ' + data.Encounter['duration'] + '</span>';
	graphhtml += '<span class="span-absolute" style="right: 2; top: 0; text-align: right;">' + data.Encounter['title'] + '</span>';
	ele.innerHTML = graphhtml;
	
	if (config.enableGraph) {
		$('#graph-html .info-totaldps').click(function(){ 
			changeMainGraph(totalDpsGraph.slice(), totalDpsLabel.slice());
			currentTrack = '';
		});
		$('#graph-html .info-totaldps').mouseover(function() {
			$(this).css('background-color', 'rgba(255, 255, 255, 0.2)');
		}).mouseout(function() {
			$(this).css('background-color', 'transparent');
		});
	}
	
	// Is the data gate primed?
	if (!activeGate) {
		activeGate = true;
		
		// Clear the ui
		var ele = document.getElementById('main');
		while (ele.firstChild) {
			ele.removeChild(ele.firstChild);
		}
		
		// Reset/Clear the graph
		graphCanvas.data.datasets[0].data = [];
		graphCanvas.data.labels = [];
		graphCanvas.clear();
		graphCanvas.update({duration:0});
		
		// Hide menu items during combat
		if (config.hideMenu) {
			document.getElementById('menu').style.display = 'none';
			document.getElementById('graph-html').style.width = '100%';
			document.getElementById('graph-cont').style.width = '100%';
		}
		
		// Remove updates, done once
		if (updates) {
			updates = false;
			$('#updates-html').remove();
		}
		
		players.length = 0;
		players = [];
		raid24 = false;
		totalDpsGraph = [0];
		totalDpsLabel = [0];
		totalDpsTick = 1;
		totalTick = 0;
		if (config.graphTrack == 'Yourself') {
			currentTrack = config.detectYou;
		} else {
			currentTrack = '';
		}
	}
	
	//if (true) {
	if (data.isActive) {
		// Check for new players
		for (let e in data.Combatant) {
			let entry = data.Combatant[e];
			// 24 player hard cap per Encounter. Do you really need more?
			if (inArrayKey(players, 'name', entry['name'], true) == false && Player.isValid(entry) && players.length < 24) {
				// Make a new player entry
				let newPlayer = new Player(entry, config);
				newPlayer.divID = players.length;
				
				switch (newPlayer.role) {
					case 'dps':
						newPlayer.divRGBA = config.dpsRGBA;
						newPlayer.divRGBA_ = config.dpsRGBA_;
						newPlayer.divRGBA__ = config.dpsRGBA__;
						break;
					case 'tank':
						newPlayer.divRGBA = config.tankRGBA;
						newPlayer.divRGBA_ = config.tankRGBA_;
						newPlayer.divRGBA__ = config.tankRGBA__;
						break;
					case 'healer':
						newPlayer.divRGBA = config.healerRGBA;
						newPlayer.divRGBA_ = config.healerRGBA_;
						newPlayer.divRGBA__ = config.healerRGBA__;
						break;
					case 'limit break':
						newPlayer.divRGBA = config.limitRGBA;
						newPlayer.divRGBA_ = config.limitRGBA_;
						newPlayer.divRGBA__ = config.limitRGBA__;
						break;
					default:
						newPlayer.divRGBA = config.defaultRGBA;
						newPlayer.divRGBA_ = config.defaultRGBA_;
						newPlayer.divRGBA__ = config.defaultRGBA__;
						break;
				}
				
				if (newPlayer.name == config.detectYou) {
					newPlayer.dispname = config.overrideYou;
					if (config.enableYouColor) {
						newPlayer.divRGBA = config.youRGBA;
						newPlayer.divRGBA_ = config.youRGBA_;
						newPlayer.divRGBA__ = config.youRGBA__;
					}
				}
				
				if (newPlayer.role != 'limit break') {
					createDiv(newPlayer, theme);
					players.push(newPlayer);
				} else if (newPlayer.role == 'limit break' && config.showLb && !raid24) {
					createDiv(newPlayer, theme);
					players.push(newPlayer);
				}
			}
		}
		
		// Raid 24
		if (players.length > 9 && config.enableRaid24) { // 9 players is the max for non raids (Pet, Lb, etc)
			raid24 = true;
			if (config.graphTrack == 'Yourself') {
				currentTrack = config.detectYou;
			} else {
				currentTrack = '';
			}
		}
		
		// Update then sort players
		topDamage = 0;
		for (let p in players) {
			players[p].update(data.Combatant);
			if (parseFloat(players[p].dps) > topDamage) topDamage = parseFloat(players[p].dps);
			// Stop graphing if enableGraph24 is false
			if (!config.enableGraph24 && raid24 && players[p].name != currentTrack && !players[p].stopGraph) {
				players[p].stopGraph = true;
				$('#' + players[p].divID + ' .player-name').prop('onclick', null).off('click');
				$('#' + players[p].divID + ' .player-name').unbind('mouseout mouseover');
			}
			
			// Toasty?
			if (players[p].state == 'dead' && config.eToasty) {
				if (eToasty < 1) funcToasty(true);
				eToasty++;
			}
		}
		players.sort(function(a, b) {
			return a.dps - b.dps;
		});
		if (config.layoutVertical) players.reverse();
		
		// Animation
		for (let d in players) {
			// Animate
			var valid24 = false;
			if (config.layoutVertical && d > 7) {
				valid24 = true;
			} else if (!config.layoutVertical && d < (players.length - 8)) {
				valid24 = true;
			}
			
			if (valid24 && raid24) {
				animateDiv24(players[d], d, theme);
			} else {
				animateDiv(players[d], d, theme);
			}
			
			// Graph updates if player
			if (players[d].name == currentTrack && config.enableGraph && players[d].dpsLabel.length > totalTick) {
				totalTick = players[d].dpsLabel.length;
				graphCanvas.data.labels.push(totalTick);
				graphCanvas.data.datasets.forEach((dataset) => {
					dataset.data.push(players[d].dpsGraph[totalTick - 1]);
				});
				graphCanvas.update();
			}
		}
		
		// Update graph data for Total DPS
		if (config.enableGraph && totalDpsTick == config.graphTick) {
			if (!isNaN(data.Encounter['Last10DPS']) && parseFloat(data.Encounter['Last10DPS']) > -1) {
				totalDpsGraph.push(parseFloat(data.Encounter['Last10DPS']));
			} else {
				totalDpsGraph.push(parseFloat(0.00));
			}
			totalDpsLabel.push(totalDpsLabel.length);
			totalDpsTick = 1;
		} else {
			totalDpsTick++;
		}
		
		// Graph total dps if selected
		if (currentTrack == '' && totalDpsLabel.length > totalTick) {
			totalTick = totalDpsLabel.length;
			graphCanvas.data.labels.push(totalTick);
			graphCanvas.data.datasets.forEach((dataset) => {
				dataset.data.push(totalDpsGraph[totalTick - 1]);
			});
			graphCanvas.update();
		}
	} else {
		// Show menu items once out of combat
		if (config.hideMenu) {
			document.getElementById('menu').style.display = 'block';
			document.getElementById('graph-html').style.width = 'calc(100% - 26px)';
			document.getElementById('graph-cont').style.width = 'calc(100% - 26px)';
		}
	
		// The encounter is no longer active
		activeGate = false;
		
	}
}

// Helper functions
function changeMainGraph(gData, lData) {
	graphCanvas.data.labels = lData;
	graphCanvas.data.datasets[0].data = gData;
	graphCanvas.clear();
	graphCanvas.update({duration:0});
	totalTick = lData.length;
}

function inArrayKey(array, key, value, mode) {
	try{
		for (var i = 0; i < array.length; i++) {
			if (array[i][key] === value) {
				if (mode) {
					return array[i];
				} else {
					return i;
				}
			}
		}
	}catch(error) {
		return false;
	}
    return false;
}

function sortByKey(array, key) {
	return array.sort(function(a, b) {
		var x = parseFloat(a[key]);
		var y = parseFloat(b[key]);
		if(a < b) return -1;
		if(a > b) return 1;
	}).reverse();
}

function insertAndShift(arr, at, to) {
    let cutOut = arr.splice(at, 1)[0];
    arr.splice(to, 0, cutOut);
}

function createDebugPlayer(mode) {
	var dname = 'Debug Dummy';
	var djob = 'gnb';
	if (mode) {
		dname = 'Limit Break';
		djob = '';
	}
	var debugPlayer = new Player({name:dname, Job:djob}, config);
	debugPlayer.divID = players.length;
	debugPlayer.divRGBA = config.defaultRGBA;
	debugPlayer.divRGBA_ = config.defaultRGBA_;
	debugPlayer.divRGBA__ = config.defaultRGBA__;
	debugPlayer.dps = Math.floor(Math.random() * (1000 - 500 + 1) + 500);
	debugPlayer.dpsbase = debugPlayer.dps;
	createDiv(debugPlayer, theme);
	players.push(debugPlayer);
}

// Hide and show handle
document.addEventListener("onOverlayStateUpdate", function (e) {
	if (!e.detail.isLocked) {
		document.documentElement.classList.add("resizeHandle");
	} else {
		document.documentElement.classList.remove("resizeHandle");
	}
});

// THEMES
function createDiv(player, theme) {
	if (theme == 'thresher') {
		let newEle = document.createElement("div");
		newEle.setAttribute('id', player.divID);
		newEle.setAttribute('class', 'playerdiv');

		if (config.playerFill) {
			newEle.style.width = '100%';
			if (config.layoutHorizontal) {
				newEle.style.left = '-100%';
			} else {
				newEle.style.right = '-100%';
			}
		} else {
			newEle.style.width = 'calc(100% - 100px)';
			if (config.layoutHorizontal) {
				newEle.style.left = 'calc(-100% + 100px)';
			} else {
				newEle.style.right = 'calc(-100% + 100px)';
			}
		}

		if (config.layoutVertical) {
			newEle.style.top = '3';
		} else {
			newEle.style.bottom = '0';
		}

		newEle.style.height = '30px';
		newEle.style.background = 'linear-gradient(to right, ' + player.divRGBA + ' 0%, ' + player.divRGBA__ + ' 50%, ' + player.divRGBA + ' 100%)';
		newEle.style.boxShadow = '0px 3px 4px -2px rgba(0, 0, 0, ' + config.playerAlpha + ')';
		newEle.style.color = config.playerTextColor;

		var eleHTML = '';

		eleHTML += '<div class="player-effect-cont" style="box-shadow: inset 0 0 10px ' + player.divRGBA_ + ';"><div class="player-class-img" style="background-image: url(images/' + player.job + '.png);"></div></div>';
		eleHTML += '<span class="player-name">' + player.dispname + '</span>';
		eleHTML += '<span class="player-dps-base" style="color: ' + config.playerDPSColor + '">' + player.dpsbase + '</span><span class="player-dps-dec" style="color: ' + config.playerDPSColor + '">.' + player.dpsdec + '</span>';
		eleHTML += '<span class="player-stat crit" style="left: 25%; bottom: 1; margin-left: 3px;">' + player.crit + '</span>';
		eleHTML += '<span class="player-stat dhit" style="left: 40%; bottom: 1; margin-left: 3px;">' + player.dhit + '</span>';
		eleHTML += '<span class="player-stat critdhit" style="left: 55%; bottom: 1; margin-left: 3px;">' + player.critdhit + '</span>';
		eleHTML += '<span class="player-stat deaths" style="left: 70%; bottom: 1; margin-left: 3px;">' + player.deaths + '</span>';
		eleHTML += '<span class="player-stat maxhit" style="right: 0; bottom: 1; margin-right: 5px; text-align: right;">' + player.maxhit + '<br />' + player.maxhitnum + '</span>';
		eleHTML += '<div class="player-dps-bar"></div>';
		
		eleHTML += '<div class="tooltip">';
		eleHTML += '<span class="tt-name">' + player.dispname + '</span>';
		eleHTML += '<p class="tt-stat tt-maxhit" style="margin-top: 5px;">' + player.maxhit + '<br />' + player.maxhitnum + '</p>';
		eleHTML += '<span class="tt-stat tt-crit" style="position: absolute; bottom: 5; left: 5;">' + player.crit + '</span>';
		eleHTML += '<span class="tt-stat tt-dhit" style="position: absolute; bottom: 5; left: 30%;">' + player.dhit + '</span>';
		eleHTML += '<span class="tt-stat tt-critdhit" style="position: absolute; bottom: 5; right: 30%;">' + player.critdhit + '</span>';
		eleHTML += '<span class="tt-stat tt-deaths" style="position: absolute; bottom: 5; right: 5;">' + player.deaths + '</span>';
		eleHTML += '</div>';

		newEle.innerHTML = eleHTML;

		document.getElementById('main').appendChild(newEle);
		
		if (config.enableGraph && player.role != 'limit break') {
			$('#' + player.divID + ' .player-name').click(function(){ 
				changeMainGraph(player.dpsGraph.slice(), player.dpsLabel.slice());
				currentTrack = player.name;
			});
			$('#' + player.divID + ' .player-name').mouseover(function() {
				$(this).css('background-color', 'rgba(255, 255, 255, 0.2)');
			}).mouseout(function() {
				$(this).css('background-color', 'transparent');
			});
		}

		/*Debug*/
		//$('#'+player.divID).click(function(){ 
			//player.displaymaxhit = true;
			//player.displaycrit = true;
			//player.state = 'dead';
			//changeMainGraph(player.dpsGraph, player.dpsLabel);
			//currentTrack = player.name;
			//createDebugPlayer(false);
			//eToasty = 5;
			//funcToasty();
		//});
	}
}

function animateDiv(player, d, theme) {
	if (theme == "thresher") { 
		// Update div elements
		let eleA = document.getElementById(player.divID);
		
		// Was this player previously not in the top8?
		if (!player.top8) {
			// Show unimportant data
			$('#' + player.divID + ' .player-dps-dec').show();
			$('#' + player.divID + ' .player-stat.crit').show();
			$('#' + player.divID + ' .player-stat.dhit').show();
			$('#' + player.divID + ' .player-stat.critdhit').show();
			$('#' + player.divID + ' .player-stat.deaths').show();
			$('#' + player.divID + ' .player-stat.maxhit').show();
			
			// If so, restyle div to a normal div.
			eleA.style.left = 'auto';
			eleA.style.right = 'auto';
			eleA.style.top = 'auto';
			eleA.style.bottom = 'auto';
			
			$('#' + player.divID + ' .player-class-img').css('right', '30%');
			$('#' + player.divID + ' .player-class-img').css('top', '-5');
			$('#' + player.divID + ' .player-class-img').css('width', '45px');
			$('#' + player.divID + ' .player-class-img').css('height', '45px');
			
			if (config.playerFill) {
				eleA.style.width = '100%';
			} else {
				eleA.style.width = 'calc(100% - 100px)';
			}
			
			if (config.layoutHorizontal) {
				eleA.style.left = '0)';
			} else {
				eleA.style.right = '0';
			}
			
			// Restyle
			$('#' + player.divID + ' .player-dps-base').removeClass('player-dps-base-24');
			$('#' + player.divID + ' .player-name').removeClass('player-name-24');
			$('#' + player.divID + ' .tooltip').removeClass('tt-hover');
			
			// Change name
			$('#' + player.divID + ' .player-name').text(player.dispname);
		}
		
		var dpsbarwidth = (parseFloat(player.dps)/topDamage) * 100;
		
		$('#' + player.divID + ' .player-dps-base').text(player.dpsbase);
		$('#' + player.divID + ' .player-dps-dec').text('.' + player.dpsdec);
		$('#' + player.divID + ' .player-stat.crit').text(player.crit);
		$('#' + player.divID + ' .player-stat.dhit').text(player.dhit);
		$('#' + player.divID + ' .player-stat.critdhit').text(player.critdhit);
		$('#' + player.divID + ' .player-stat.deaths').text(player.deaths);
		$('#' + player.divID + ' .player-stat.maxhit').html(player.maxhit + '<br />' + player.maxhitnum);
		$('#' + player.divID + ' .player-dps-bar').width(dpsbarwidth + '%');

		
		if (config.layoutHorizontal) {
			$('#' + player.divID + ' .player-dps-bar').css('left', '0');
		} else {
			$('#' + player.divID + ' .player-dps-bar').css('right', '0');
		}
		
		// Alive
		if (player.state == "alive") {
			// Maxhit effect
			if (player.displaymaxhit == true && config.showMaxhits && !config.playerFill) {
				player.displaymaxhit = false;
				var num = Math.floor(Math.random()*5) + 1;
				num *= Math.floor(Math.random()*2) == 1 ? 1 : -1;
				let sidepop = document.createElement("div");
				sidepop.setAttribute('id', 'maxhit' + player.divID + Date.now());
				sidepop.setAttribute('class', 'player-side-popup');
				sidepop.style.transform = 'rotate(' + num + 'deg)';
				sidepop.innerHTML = player.maxhit + '<br />' + player.maxhitnum;
				sidepop.style.top = -10;
				document.getElementById(player.divID).appendChild(sidepop);
				var sideOffset = '';
				if (config.layoutHorizontal) {
					sideOffset = $(sidepop, this).width()/2 * -1;
					sidepop.style.right = sideOffset - 40;
					sideOffset = (sideOffset/2) - 40;
					$(sidepop).delay(1500).animate({ // JQuery does this better
						'opacity' : 0,
						'height': '50%',
						'width': '15%',
						'top': "25%",
						'right': sideOffset,
						'fontSize': '50%'
					}, 500, function(e){
						$(sidepop).remove();
					});
				} else {
					sideOffset = $(sidepop, this).width()/2 * -1;
					sidepop.style.left = sideOffset - 40;
					sideOffset = sideOffset/2 - 40;
					$(sidepop).delay(1500).animate({ // JQuery does this better
						'opacity' : 0,
						'height': '50%',
						'width': '15%',
						'top': "25%",
						'left': sideOffset,
						'fontSize': '50%'
					}, 500, function(e){
						$(sidepop).remove();
					});
				}
				/*TweenMax.to(sidepop, 0.5, {
					top: "20%",
					left: sideleft,
					height: '50%',
					width: '50%',
					opacity: '0',
					fontSize: '50%',
					delay: '1.5',
				});
				setTimeout(function(){
					$(sidepop, this).remove();
				}, 2000);*/
			}
			
			// Crit effect
			if (player.displaycrit == true && config.critBlip) {
				player.displaycrit = false;
				let critwave1 = document.createElement("div");
				critwave1.setAttribute('id', 'crit' + player.divID + Date.now());
				critwave1.setAttribute('class', 'critline');
				critwave1.style.right = "0";
				critwave1.style.width = '5px';
				critwave1.style.height = '100%';
				critwave1.style.top = 0;
				critwave1.style.opacity = 0.8;
				document.getElementById(player.divID).getElementsByClassName('player-effect-cont')[0].appendChild(critwave1);
				
				TweenMax.to(critwave1, 1, {
					right: '100%',
					ease: Power2.easeOut
				});
				setTimeout(function(){
					$(critwave1, this).remove();
				}, 1000);
			}
		}
		
		// Dead
		if (player.state == "dead") {
			player.state = "alive";
			if (config.deathColor) {
				let playerRGBA = player.divRGBA;
				let playerRGBA_ = player.divRGBA_;
				let playerRGBA__ = player.divRGBA__;
				eleA.style.background = 'linear-gradient(to right, rgba(200, 200, 200, ' + config.playerAlpha + ') 0%, rgba(0,0,0,' + config.playerAlpha + ') 50%, rgba(200, 200, 200, ' + config.playerAlpha + ') 100%)';
				eleA.getElementsByClassName('player-effect-cont')[0].style.boxShadow = 'inset 0 0 10px rgba(200, 200, 200, ' + config.playerAlpha + ')';
				
				TweenMax.to(eleA, 3, {
					background: 'linear-gradient(to right, ' + playerRGBA + ' 0%, ' + playerRGBA__ + ' 50%, ' + playerRGBA + ' 100%)',
					delay: '2'
				});
				TweenMax.to(eleA.getElementsByClassName('player-effect-cont')[0], 3, {
					boxShadow: 'inset 0 0 10px ' + playerRGBA_,
					delay: '2'
				});
			}
			
			if (config.deathShake) {
				TweenMax.fromTo(eleA, 4, { rotation: 0.5}, {rotation: 0, ease:Elastic.easeOut.config(5, 0.01)});
			}
			
			if (config.deathBlood) {
				for (let i = 0; i < 3; i++) {
					var num = Math.floor(Math.random() * eleA.clientWidth);
					var numw = Math.floor(Math.random() * (60 - 5 + 1) + 5);
					var numh = Math.floor(Math.random() * (eleA.clientHeight - 5 + 1) + 5);
					let splat = document.createElement('div');
					splat.setAttribute('id', player.divID + num + Date.now());
					splat.setAttribute('class', 'bloodsplat');
					splat.style.left = num + 'px';
					splat.style.width = numw + 'px';
					splat.style.height = numh + 'px';
					splat.style.filter = 'url(#splatfilter' + num + ')';
					var NS = "http://www.w3.org/2000/svg";
					var svg = document.createElementNS(NS, 'svg');
					var filter = document.createElementNS(NS, 'filter');
					filter.setAttribute('id', 'splatfilter' + num);
					var feturb = document.createElementNS(NS, 'feTurbulence');
					feturb.setAttribute('type', 'fractalNoise');
					feturb.setAttribute('baseFrequency', '0.1');
					feturb.setAttribute('seed', num);
					var fedisp = document.createElementNS(NS, 'feDisplacementMap');
					fedisp.setAttribute('in', 'SourceGraphic');
					fedisp.setAttribute('scale', '50');
					filter.appendChild(feturb);
					filter.appendChild(fedisp);
					svg.appendChild(filter);
					splat.appendChild(svg);
					eleA.appendChild(splat);
					
					TweenMax.to(splat, 3, {
						opacity: '0',
						delay: '2'
					});
					setTimeout(function(){
						$(splat, this).remove();
					}, 5000);
				}
			}
		}
		
		// Always animate sorting
		var divHeight = 30;
		var divOffset = 0;
		var curOffset = 0;
		var raidOffset = parseInt(d);
		
		if (raid24 && config.layoutVertical) {
			// do nothing
		} else if (raid24 && !config.layoutVertical) {
			if (players.length > 16) {
				raidOffset = parseInt(d) - (players.length - 9) + 1;
			} else {
				raidOffset = parseInt(d) - (players.length - 9);
			}
		}
		
		if (config.layoutVertical) {
			divOffset = (raidOffset * divHeight) + (raidOffset * 5) + 2;
			// Quickly sort if back in top8
			if (!player.top8) {
				eleA.style.top = divOffset + 'px';
				player.top8 = true; // Now in top8
			}
			curOffset = eleA.style.top;
		} else {
			divOffset = (raidOffset * divHeight) + (raidOffset * 5) + 5;
			// Quickly sort if back in top8
			if (!player.top8) {
				eleA.style.bottom = divOffset + 'px';
				player.top8 = true; // Now in top8
			}
			curOffset = eleA.style.bottom;
		}
		
		// Sorting animation
		if (player.state != 'initialize' && curOffset != divOffset) {
			if (config.layoutVertical) {
				TweenMax.to(eleA, 0.2, {
					top: divOffset + 'px'
				});
			} else {
				TweenMax.to(eleA, 0.2, {
					bottom: divOffset + 'px'
				});
			}
		}
		
		// Initialize and move, not animated
		if (player.state == 'initialize') {
			if (config.layoutVertical) {
				eleA.style.top = divOffset + 'px';
			} else {
				eleA.style.bottom = divOffset + 'px';
			}
			
			if (config.layoutHorizontal) {
				$(eleA, this).animate({ // JQuery does this better
					'left': '0'
				}, 200, function(e){
					player.state = "alive";
					eleA.style.left = '0';
				});
				/*TweenMax.to(eleA, 1, {
					left: '0px',
					immediateRender: true,
					onComplete: function(){
						player.state = 'alive';
					}
				});*/
			} else {
				$(eleA, this).animate({ // JQuery does this better
					'right': '0'
				}, 200, function(e){
					player.state = "alive";
					eleA.style.right = '0';
				});
				/*TweenMax.to(eleA, 1, {
					right: '0px',
					immediateRender: true,
					onComplete: function(){
						player.state = 'alive';
					}
				});*/
			}
		}
	}
}

function animateDiv24(player, d, theme) {
	let ele24 = document.getElementById(player.divID);
	// Was this player previously in the top8?
	if (player.top8) {
		// Hide unimportant data
		$('#' + player.divID + ' .player-dps-dec').hide();
		$('#' + player.divID + ' .player-stat.crit').hide();
		$('#' + player.divID + ' .player-stat.dhit').hide();
		$('#' + player.divID + ' .player-stat.critdhit').hide();
		$('#' + player.divID + ' .player-stat.deaths').hide();
		$('#' + player.divID + ' .player-stat.maxhit').hide();
		
		// If so, restyle div to a smaller div.
		ele24.style.left = 'auto';
		ele24.style.right = 'auto';
		ele24.style.top = 'auto';
		ele24.style.bottom = 'auto';
		
		ele24.style.width = '12.5%';
		if (config.playerFill) {
			ele24.style.width = '12.5%';
		} else {
			ele24.style.width = 'calc(12.5% - 12.5px)';
		}
		
		ele24.style.transform = 'none'; // Sanitize transforms
		
		// Restyle
		$('#' + player.divID + ' .player-dps-base').addClass('player-dps-base-24');
		$('#' + player.divID + ' .player-name').addClass('player-name-24');
		if (config.enableTooltip24) {
			$('#' + player.divID + ' .tooltip').addClass('tt-hover');
		}
		if (config.layoutHorizontal) {
			$('#' + player.divID + ' .player-dps-bar').css('left', '0');
		} else {
			$('#' + player.divID + ' .player-dps-bar').css('right', '0');
		}
		$('#' + player.divID + ' .player-class-img').css('right', '0');
		$('#' + player.divID + ' .player-class-img').css('top', '0');
		$('#' + player.divID + ' .player-class-img').css('width', '30px');
		$('#' + player.divID + ' .player-class-img').css('height', '30px');
		
		// Change name
		$('#' + player.divID + ' .player-name').text(player.name2);
				
		player.top8 = false; // No longer top8
	}
	
	// Update relevant data
	var dpsbarwidth = (parseFloat(player.dps)/topDamage) * 100;
	$('#' + player.divID + ' .player-dps-bar').width(dpsbarwidth + '%');
	$('#' + player.divID + ' .player-dps-base').text(player.dpsbase);
	if (config.enableTooltip24) {
		$('#' + player.divID + ' .tt-crit').text(player.crit);
		$('#' + player.divID + ' .tt-dhit').text(player.dhit);
		$('#' + player.divID + ' .tt-critdhit').text(player.critdhit);
		$('#' + player.divID + ' .tt-deaths').text(player.deaths);
		$('#' + player.divID + ' .tt-maxhit').html(player.maxhit + '<br />' + player.maxhitnum);
	}
	
	// Beyond 8, containers are moved instantly and are not animated
	
	// Y Offset
	var divHeight = 30;
	var divOffsetY = 0;
	var curOffsetY = 0;
	var dint = parseInt(d);
	var raidOffsetY = 0;
	
	if (config.layoutVertical) {
		if (dint > 15) {
			raidOffsetY = 9;
		} else {
			raidOffsetY = 8;
		}
	} else {
		if (players.length > 16 && dint < (players.length - 16)) {
			raidOffsetY = 0;
		} else if (players.length > 16) {
			raidOffsetY = 1;
		}
	}
	
	if (config.layoutVertical) {
		divOffsetY = (raidOffsetY * divHeight) + (raidOffsetY * 5) + 2;
		curOffsetY = ele24.style.top;
	} else {
		divOffsetY = (raidOffsetY * divHeight) + (raidOffsetY * 5) + 5;
		curOffsetY = ele24.style.bottom;
	}
	
	if (curOffsetY != divOffsetY) { // Save on moving vertically
		if (config.layoutVertical) {
			ele24.style.top = divOffsetY + 'px';
		} else {
			ele24.style.bottom = divOffsetY + 'px';
		}
	}
	
	// X Offset
	var curOffsetX = 0;
	var divOffsetX = 0;
	var raidOffsetX = dint;
	// dint starts at 0, we need a position between 0 and 7
	if (config.layoutVertical) {
		var flip = players.length;
		if (dint > 15) {
			flip = flip - 17;
			raidOffsetX = dint - 16;
		} else {
			if (players.length > 16) {
				flip = (flip - 9) - (flip - 16);
			} else {
				flip = flip - 9;
			}
			raidOffsetX = dint - 8;
		}
		// We need to flip raidOffetX
		raidOffsetX = flip - raidOffsetX;
	} else {
		var flip = players.length;
		if (dint > 7) {
			flip = flip - 9;
			raidOffsetX = dint - 8;
		} else {
			if (players.length > 16) {
				flip = (flip - 9) - (flip - 16);
			}
			raidOffsetX = dint;
		}
	}
	
	if (config.playerFill) {
		divOffsetX = 'calc(12.5% * ' + raidOffsetX + ')';
	} else {
		divOffsetX = 'calc((12.5% * ' + raidOffsetX + ') - (12.5px * ' + raidOffsetX + '))';
	}
	
	if (config.layoutHorizontal) {
		curOffsetX = ele24.style.left;
	} else {
		curOffsetX = ele24.style.right;
	}
	
	if (curOffsetX != divOffsetX) { // Save on moving horizontally
		if (config.layoutHorizontal) {
			ele24.style.left = divOffsetX;
		} else {
			ele24.style.right = divOffsetX;
		}
	}
	
	// Resolve special animations
	if (player.state != 'alive') player.state = 'alive';
	if (player.displaycrit) player.displaycrit = false;
	if (player.displaymaxhit) player.displaymaxhit = false;
}










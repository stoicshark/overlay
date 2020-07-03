'use strict';

// Config things
let config = new Config();
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
	let config = new Config();
	localStorage.setItem('config', JSON.stringify(config)); // There you go
}

// Set graphing animation speed
Chart.defaults.global.animation.duration = 500;

// Check if configuration is saved
localStorage.setItem('config-saved', false);
setInterval(function(){	
	if (localStorage.getItem('config-saved') == "true") {
		location.reload(); // Hard reload the parser - for now
	}
}, 500);

// Initial setup
let encounter;
let updates = true;
let activeGate = false;
let topDamage = 0;
let totalDpsTick = 1;
let totalTick = 0;
let currentTrack = '';
if (config.graphTrack == 'Yourself') currentTrack = config.detectYou;
let raid24 = false;

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
				toastydiv.style.left = '-100%';
				document.body.appendChild(toastydiv);
				anime({
					targets: toastydiv,
					easing: 'linear',
					left: [
						{
							duration: 300,
							value: '0'
						},
						{
							delay: 1000,
							duration: 300,
							value: '-100%'
						}
					],
					complete: function() {
						$(toastydiv, this).remove();
					}
				});
			} else {
				toastydiv.style.right = '-100%';
				document.body.appendChild(toastydiv);
				anime({
					targets: toastydiv,
					easing: 'linear',
					right: [
						{
							duration: 300,
							value: '0'
						},
						{
							delay: 1000,
							duration: 300,
							value: '-100%'
						}
					],
					complete: function() {
						$(toastydiv, this).remove();
					}
				});
			}
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
document.body.style.zoom = config.overlayZoom;

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
document.getElementById('information').style.color = config.infoTextColor;
document.getElementById('information').style.backgroundColor = config.infoColor;

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
	document.getElementById('information').style.width = '100%';
	document.getElementById('updates-html').style.width = 'calc(100% - 10px)';
} else {
	document.getElementById('information').style.width = 'calc(100% - 100px)';
	document.getElementById('updates-html').style.width = 'calc(100% - 110px)';
}

// Vertical and horizontal layout setup
if (config.layoutVertical) {
	document.getElementById('header').style.top = '0';
	document.getElementById('information').style.top = '52';
	document.getElementById('main').style.top = '67';
	document.getElementById('updates-html').style.top = '69';
} else {
	document.getElementById('header').style.bottom = '0';
	document.getElementById('information').style.bottom = '52';
	document.getElementById('main').style.bottom = '67';
	document.getElementById('updates-html').style.bottom = '69';
	document.getElementById('dropdown').style.bottom = 50;
}

if (config.layoutHorizontal) {
	document.getElementById('header').style.left = '0';
	document.getElementById('information').style.left = '0';
	document.getElementById('main').style.left = '0';
	document.getElementById('updates-html').style.left = '0';
} else {
	document.getElementById('header').style.right = '0';
	document.getElementById('information').style.right = '0';
	document.getElementById('main').style.right = '0';
	document.getElementById('updates-html').style.right = '0';
}

// Quick Menu
$('#menu').click(function(e){
	$('#dropdown').toggleClass('show-dropdown');
});
$('#dropdown').click(function(e) {
	e.stopPropagation();
});

$('#dropdown').mouseleave(function(e){
	$('#dropdown').removeClass('show-dropdown');
});

function quickMenu(mode) {
	$('#dropdown').removeClass('show-dropdown');
	if (mode == 'settings') {
		window.open('settings.html', 'SettingsWin', 'width=700, height=400,  resizable=no');
	}
}

// Event listener from ACT
document.addEventListener("onOverlayDataUpdate", function (e) {
	update(e.detail);
});

// UPDATE
function update(rawdata) {
	var data = new Data(rawdata);
	
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
	
	// Update information data
	var ele = document.getElementById('information');
	var infohtml = '';
	if (config.style == 'Skye') {
		infohtml += '<span class="span-absolute" style="left: 2; top: 1;">DPS</span>';
		infohtml += '<span class="span-absolute" style="left: 25%; margin-left: 3px; top: 1;">CRIT</span>';
		infohtml += '<span class="span-absolute" style="left: 40%; margin-left: 3px; top: 1;">DHIT</span>';
		infohtml += '<span class="span-absolute" style="left: 55%; margin-left: 3px; top: 1;">! ! !</span>';
		infohtml += '<span class="span-absolute" style="left: 70%; margin-left: 3px; top: 1;">DEATHS</span>';
		infohtml += '<span class="span-absolute" style="right: 2; margin-left: 3px; top: 1; text-align: right;">MAXHIT</span>';
	}
	if (config.style == 'Slim') {
		infohtml += '<span class="span-absolute" style="left: 2; top: 1;">DPS</span>';
		infohtml += '<span class="span-absolute" style="left: 50%; margin-left: 3px; top: 1;">CRIT</span>';
		infohtml += '<span class="span-absolute" style="left: 60%; margin-left: 3px; top: 1;">DHIT</span>';
		infohtml += '<span class="span-absolute" style="left: 70%; margin-left: 3px; top: 1;">! ! !</span>';
		infohtml += '<span class="span-absolute" style="left: 80%; margin-left: 3px; top: 1;">DEATHS</span>';
	}
	ele.innerHTML = infohtml;
	
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
			changeMainGraph(encounter.totalDpsGraph.slice(), encounter.totalDpsLabel.slice());
			currentTrack = '';
		});
		$('#graph-html .info-totaldps').mouseover(function() {
			$(this).css('background-color', 'rgba(255, 255, 255, 0.2)');
		}).mouseout(function() {
			$(this).css('background-color', 'transparent');
		});
	}
	
	// ENCOUNTER START
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
		
		// Remove results screen
		$('#result-cont').remove();
		
		// RESET ENCOUNTER
		encounter = new Encounter(config);
		topDamage = 0;
		raid24 = false;
		totalDpsTick = 1;
		totalTick = 0;
		if (config.graphTrack == 'Yourself') {
			currentTrack = config.detectYou;
		} else {
			currentTrack = '';
		}
	}
	
	// ENCOUNTER UPDATE
	if (data.isActive) {
		// Check for new players
		for (let e in data.Combatant) {
			let entry = data.Combatant[e];
			// 24 player hard cap per Encounter. Do you really need more?
			if (inArrayKey(encounter.players, 'name', entry['name'], true) == false && Player.isValid(entry) && encounter.players.length < 24) {
				// Make a new player entry
				let newPlayer = new Player(entry, config);
				newPlayer.divID = encounter.players.length;
				
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
					createDiv(newPlayer);
					encounter.players.push(newPlayer);
				} else if (newPlayer.role == 'limit break' && config.showLb && !raid24) {
					createDiv(newPlayer);
					encounter.players.push(newPlayer);
				}
			}
		}
		
		// Raid 24
		if (encounter.players.length > 9 && config.enableRaid24) { // 9 players is the max for non raids (Pet, Lb, etc)
			raid24 = true;
			if (config.graphTrack == 'Yourself') {
				currentTrack = config.detectYou;
			} else {
				currentTrack = '';
			}
		}
		
		// Update then sort players
		topDamage = 0;
		for (let p in encounter.players) {
			encounter.players[p].update(data.Combatant);
			if (parseFloat(encounter.players[p].dps) > topDamage) {
				topDamage = parseFloat(encounter.players[p].dps);
				encounter.topDamage = topDamage;
			}
			// Stop graphing if enableGraph24 is false
			if (!config.enableGraph24 && raid24 && encounter.players[p].name != currentTrack && !encounter.players[p].stopGraph) {
				encounter.players[p].stopGraph = true;
				if (config.style == 'Skye') {
					$('#' + encounter.players[p].divID + ' .player-name').prop('onclick', null).off('click');
					$('#' + encounter.players[p].divID + ' .player-name').unbind('mouseout mouseover');
				}
				if (config.style == 'Slim') {
					$('#' + encounter.players[p].divID + ' .player-name-slim').prop('onclick', null).off('click');
					$('#' + encounter.players[p].divID + ' .player-name-slim').unbind('mouseout mouseover');
				}
			}
			
			// Toasty?
			if (encounter.players[p].state == 'dead' && config.eToasty) {
				if (eToasty < 1) funcToasty(true);
				eToasty++;
			}
		}
		encounter.players.sort(function(a, b) {
			return a.dps - b.dps;
		});
		if (config.layoutVertical) encounter.players.reverse();
		
		// Animation
		for (let d in encounter.players) {
			// Animate
			var valid24 = false;
			if (config.layoutVertical && d > 7) {
				valid24 = true;
			} else if (!config.layoutVertical && d < (encounter.players.length - 8)) {
				valid24 = true;
			}
			
			if (valid24 && raid24) {
				animateDiv24(encounter.players[d], d);
			} else {
				animateDiv(encounter.players[d], d);
			}
			
			// Graph updates if player
			if (encounter.players[d].name == currentTrack && config.enableGraph && encounter.players[d].dpsLabel.length > totalTick) {
				totalTick = encounter.players[d].dpsLabel.length;
				graphCanvas.data.labels.push(totalTick);
				graphCanvas.data.datasets.forEach((dataset) => {
					dataset.data.push(encounter.players[d].dpsGraph[totalTick - 1]);
				});
				graphCanvas.update();
			}
		}
		
		// Update graph data for Total DPS
		if (config.enableGraph && totalDpsTick == config.graphTick) {
			if (!isNaN(data.Encounter['Last10DPS']) && parseFloat(data.Encounter['Last10DPS']) > -1) {
				encounter.totalDpsGraph.push(parseFloat(data.Encounter['Last10DPS']));
			} else {
				encounter.totalDpsGraph.push(parseFloat(0.00));
			}
			encounter.totalDpsLabel.push(encounter.totalDpsLabel.length);
			totalDpsTick = 1;
		} else {
			totalDpsTick++;
		}
		
		// Graph total dps if selected
		if (currentTrack == '' && encounter.totalDpsLabel.length > totalTick) {
			totalTick = encounter.totalDpsLabel.length;
			graphCanvas.data.labels.push(totalTick);
			graphCanvas.data.datasets.forEach((dataset) => {
				dataset.data.push(encounter.totalDpsGraph[totalTick - 1]);
			});
			graphCanvas.update();
		}
	} else {
		// ENCOUNTER END
		
		// Show menu items once out of combat
		if (config.hideMenu) {
			document.getElementById('menu').style.display = 'block';
			document.getElementById('graph-html').style.width = 'calc(100% - 26px)';
			document.getElementById('graph-cont').style.width = 'calc(100% - 26px)';
		}
	
		// The encounter is no longer active
		activeGate = false;
		
		// Save the last data snapshot
		encounter.data = data;
		
		// Show results screen?
		if (config.enableResultsScreen) {
			showResultScreen();
		}
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
	var djob = 'drg';
	if (mode) {
		dname = 'Limit Break';
		djob = '';
	}
	var debugPlayer = new Player({name:dname, Job:djob}, config);
	debugPlayer.divID = encounter.players.length;
	debugPlayer.divRGBA = config.defaultRGBA;
	debugPlayer.divRGBA_ = config.defaultRGBA_;
	debugPlayer.divRGBA__ = config.defaultRGBA__;
	debugPlayer.dps = Math.floor(Math.random() * (1000 - 500 + 1) + 500);
	debugPlayer.dpsbase = debugPlayer.dps;
	createDiv(debugPlayer);
	encounter.players.push(debugPlayer);
}

// Hide and show handle
document.addEventListener("onOverlayStateUpdate", function (e) {
	if (!e.detail.isLocked) {
		document.documentElement.classList.add("resizeHandle");
	} else {
		document.documentElement.classList.remove("resizeHandle");
	}
});

// Player creation
function createDiv(player) {
	// STYLE: Skye (Default)
	if (config.style == 'Skye') {
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
			newEle.style.top = '2';
		} else {
			newEle.style.bottom = '0';
		}

		newEle.style.height = '30px';
		newEle.style.background = 'linear-gradient(to right, ' + player.divRGBA + ' 0%, ' + player.divRGBA__ + ' 50%, ' + player.divRGBA + ' 100%)';
		newEle.style.boxShadow = '0px 3px 4px -2px rgba(0, 0, 0, ' + config.playerAlpha + ')';
		newEle.style.color = config.playerTextColor;

		var eleHTML = '';

		eleHTML += '<div class="player-effect-cont" style="box-shadow: inset 0 0 10px ' + player.divRGBA_ + ';"><div class="player-class-icon icon-' + player.job + '"></div></div>';
		eleHTML += '<span class="player-name">' + player.dispname + '</span>';
		eleHTML += '<span class="player-dps-base" style="color: ' + config.playerDPSColor + '">' + player.dpsbase + '</span><span class="player-dps-dec" style="color: ' + config.playerDPSColor + '">.' + player.dpsdec + '</span>';
		eleHTML += '<span class="player-stat crit" style="left: 25%; bottom: 1; margin-left: 3px;">' + player.crit + '</span>';
		eleHTML += '<span class="player-stat dhit" style="left: 40%; bottom: 1; margin-left: 3px;">' + player.dhit + '</span>';
		eleHTML += '<span class="player-stat critdhit" style="left: 55%; bottom: 1; margin-left: 3px;">' + player.critdhit + '</span>';
		eleHTML += '<span class="player-stat deaths" style="left: 70%; bottom: 1; margin-left: 3px;">' + player.deaths + '</span>';
		eleHTML += '<span class="player-stat maxhit" style="right: 0; bottom: 2; margin-right: 5px; text-align: right;">' + player.maxhit + '<br />' + player.maxhitnum + '</span>';
		eleHTML += '<div class="player-dps-bar"></div>';
		
		newEle.innerHTML = eleHTML;

		document.getElementById('main').appendChild(newEle);
	}
	
	// STYLE: Slim
	if (config.style == 'Slim') {
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

		newEle.style.height = '20px';
		newEle.style.background = player.divRGBA__;
		newEle.style.color = config.playerTextColor;

		var eleHTML = '';

		eleHTML += '<div class="player-effect-cont" style="box-shadow: inset 0 0 10px ' + player.divRGBA_ + ';"><div class="player-dps-bar" style="background: ' + player.divRGBA + '; height: 100%;"></div></div>';
		eleHTML += '<div class="player-icon-slim icon-' + player.job + '"></div>';
		eleHTML += '<span class="player-dps-slim" style="color: ' + config.playerDPSColor + '; left: 5;">' + player.dpsbase + '</span>';
		eleHTML += '<span class="player-name-slim" style="left: 15%;">' + player.dispname + '</span>';
		eleHTML += '<span class="player-stat crit" style="left: 50%; bottom: 3; margin-left: 3px;">' + player.crit + '</span>';
		eleHTML += '<span class="player-stat dhit" style="left: 60%; bottom: 3; margin-left: 3px;">' + player.dhit + '</span>';
		eleHTML += '<span class="player-stat critdhit" style="left: 70%; bottom: 3; margin-left: 3px;">' + player.critdhit + '</span>';
		eleHTML += '<span class="player-stat deaths" style="left: 80%; bottom: 3; margin-left: 3px;">' + player.deaths + '</span>';
		
		newEle.innerHTML = eleHTML;

		document.getElementById('main').appendChild(newEle);
	}
	
	// Track graph on name-click
	if (config.enableGraph && player.role != 'limit break') {
		if (config.style == 'Skye') {
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
		if (config.style == 'Slim') {
			$('#' + player.divID + ' .player-name-slim').click(function(){ 
				changeMainGraph(player.dpsGraph.slice(), player.dpsLabel.slice());
				currentTrack = player.name;
			});
			$('#' + player.divID + ' .player-name-slim').mouseover(function() {
				$(this).css('background-color', 'rgba(255, 255, 255, 0.2)');
			}).mouseout(function() {
				$(this).css('background-color', 'transparent');
			});
		}
	}
	
	// Tooltips
	if (config.enableTooltip24) {
		$('#' + player.divID).mouseover(function() {
			if (!player.top8) {
				var ttEle = document.getElementById('tooltip');
				ttEle.style.background = config.tooltipColor;
				ttEle.style.color = config.tooltipTextColor;
				
				var ttHTML = '<div class="tt-icon">' + player.icon + '</div>';
				ttHTML += '<div class="tt-name" style="top: 2; left: 5;">' + player.dispname + '</div>';
				ttHTML += '<div class="tt-stat" style="bottom: 2; left: 5;">' + player.crit + '</div>';
				ttHTML += '<div class="tt-stat" style="bottom: 2; left: 20%;">' + player.dhit + '</div>';
				ttHTML += '<div class="tt-stat" style="bottom: 2; left: 35%;">' + player.critdhit + '</div>';
				ttHTML += '<div class="tt-stat" style="bottom: 2; left: 50%;">' + player.deaths + '</div>';
				ttHTML += '<div class="tt-stat" style="bottom: 6; right: 5; text-align: right;">' + player.maxhit + '<br />' + player.maxhitnum + '</div>';
				
				ttEle.innerHTML = ttHTML;
				ttEle.style.visibility = 'visible';
			}
		}).mouseout(function() {
			var ttEle = document.getElementById('tooltip');
			ttEle.style.visibility = 'hidden';
		});
	}
	
	/*Debug*/
	$('#'+player.divID).click(function(){ 
		//player.displaymaxhit = true;
		//player.displaycrit = true;
		//player.state = 'dead';
		//changeMainGraph(player.dpsGraph, player.dpsLabel);
		//currentTrack = player.name;
		createDebugPlayer(false);
		//eToasty = 5;
		//funcToasty();
	});
}

function animateDiv(player, d) {
	// STYLE: Skye
	if (config.style == 'Skye') { 
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
			
			$('#' + player.divID + ' .player-class-icon').css('right', '30%');
			$('#' + player.divID + ' .player-class-icon').css('top', '-5');
			$('#' + player.divID + ' .player-class-icon').css('width', '45px');
			$('#' + player.divID + ' .player-class-icon').css('height', '45px');
			$('#' + player.divID + ' .player-class-icon').css('font-size', '45px');
			
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
			
			// Change name
			$('#' + player.divID + ' .player-name').text(player.dispname);
		}
		
		var dpsbarwidth = (parseFloat(player.dps)/encounter.topDamage) * 100;
		
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
					anime({
						targets: sidepop,
						easing: 'linear',
						delay: 1500,
						duration: 300,
						opacity: 0,
						scale: 0.5,
						complete: function() {
							$(sidepop, this).remove();
						}
					});
				} else {
					sideOffset = $(sidepop, this).width()/2 * -1;
					sidepop.style.left = sideOffset - 40;
					anime({
						targets: sidepop,
						easing: 'linear',
						delay: 1500,
						duration: 300,
						opacity: 0,
						scale: 0.5,
						complete: function() {
							$(sidepop, this).remove();
						}
					});
				}
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
				
				if (config.layoutHorizontal) {
					critwave1.style.left = '0';
					document.getElementById(player.divID).getElementsByClassName('player-effect-cont')[0].appendChild(critwave1);
					anime({
						targets: critwave1,
						easing: 'easeOutQuart',
						duration: 1000,
						left: '100%',
						complete: function() {
							$(critwave1, this).remove();
						}
					});
				} else {
					critwave1.style.right = '0';
					document.getElementById(player.divID).getElementsByClassName('player-effect-cont')[0].appendChild(critwave1);
					anime({
						targets: critwave1,
						easing: 'easeOutQuart',
						duration: 1000,
						right: '100%',
						complete: function() {
							$(critwave1, this).remove();
						}
					});
				}
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
				
				var deathColors = {
					col1: 'rgba(200, 200, 200, ' + config.playerAlpha + ')',
					col2: 'rgba(0,0,0,' + config.playerAlpha + ')',
					col3: 'rgba(200, 200, 200, ' + config.playerAlpha + ')'
				}
				anime({
					targets: deathColors,
					easing: 'linear',
					delay: 2000,
					duration: 3000,
					col1: playerRGBA,
					col2: playerRGBA__,
					col3: playerRGBA_,
					update: function(a) {
						var val1 = a.animations[0].currentValue;
						var val2 = a.animations[1].currentValue;
						var val3 = a.animations[2].currentValue;
						eleA.style.background = 'linear-gradient(to right, ' + val1 + ' 0%, ' + val2 + ' 50%, ' + val1 + ' 100%)';
						eleA.getElementsByClassName('player-effect-cont')[0].style.boxShadow = 'inset 0 0 10px ' + val3;
					}
				});
			}
			
			if (config.deathShake) {
				eleA.style.transform = 'rotate(2deg)';
				var shake = anime.timeline({
					easing: 'linear',
					duration: 50
				});
				
				shake
				.add({
					targets: eleA,
					rotate: '-2deg'
				})
				.add({
					targets: eleA,
					rotate: '1deg'
				})
				.add({
					targets: eleA,
					rotate: '-1.6deg'
				})
				.add({
					targets: eleA,
					rotate: '0.5deg'
				})
				.add({
					targets: eleA,
					rotate: '-0.5deg'
				})
				.add({
					targets: eleA,
					rotate: '0deg'
				});
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
					
					anime({
						targets: splat,
						easing: 'linear',
						delay: 2000,
						duration: 3000,
						opacity: '0',
						complete: function() {
							$(splat, this).remove();
						}
					});
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
			if (encounter.players.length > 16) {
				raidOffset = parseInt(d) - (encounter.players.length - 9) + 1;
			} else {
				raidOffset = parseInt(d) - (encounter.players.length - 9);
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
			divOffset = (raidOffset * divHeight) + (raidOffset * 5) + 4;
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
				anime({
					targets: eleA,
					easing: 'linear',
					duration: 200,
					top: divOffset + 'px'
				});
			} else {
				anime({
					targets: eleA,
					easing: 'linear',
					duration: 200,
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
				anime({
					targets: eleA,
					easing: 'linear',
					duration: 200,
					left: '0',
					complete: function() {
						player.state = "alive";
						eleA.style.left = '0';
					}
				});
			} else {
				anime({
					targets: eleA,
					easing: 'linear',
					duration: 200,
					right: '0',
					complete: function() {
						player.state = "alive";
						eleA.style.right = '0';
					}
				});
			}
		}
	}
	
	// STYLE: Slim
	if (config.style == 'Slim') { 
		// Update div elements
		let eleA = document.getElementById(player.divID);
		
		// Was this player previously not in the top8?
		if (!player.top8) {
			// Show unimportant data
			$('#' + player.divID + ' .player-stat.crit').show();
			$('#' + player.divID + ' .player-stat.dhit').show();
			$('#' + player.divID + ' .player-stat.critdhit').show();
			$('#' + player.divID + ' .player-stat.deaths').show();
			
			// If so, restyle div to a normal div.
			eleA.style.left = 'auto';
			eleA.style.right = 'auto';
			eleA.style.top = 'auto';
			eleA.style.bottom = 'auto';
			
			$('#' + player.divID + ' .player-dps-slim').removeClass('player-dps-slim-24');
			$('#' + player.divID + ' .player-icon-slim').removeClass('player-icon-slim-24');
			$('#' + player.divID + ' .player-name-slim').removeClass('player-name-slim-24');
			
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
			
			// Show name
			$('#' + player.divID + ' .player-name-slim').text(player.dispname);
		}
		
		var dpsbarwidth = (parseFloat(player.dps)/encounter.topDamage) * 100;
		
		$('#' + player.divID + ' .player-dps-slim').text(player.dpsbase);
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
				sidepop.setAttribute('class', 'player-side-popup-slim');
				sidepop.innerHTML = player.maxhit + '<br />' + player.maxhitnum;
				sidepop.style.top = -5;
				document.getElementById(player.divID).appendChild(sidepop);
				var sideOffset = '';
				if (config.layoutHorizontal) {
					sideOffset = $(sidepop, this).width()/2 * -1;
					sidepop.style.right = sideOffset - 40;
					anime({
						targets: sidepop,
						easing: 'linear',
						delay: 1500,
						duration: 300,
						opacity: 0,
						scale: 0.5,
						complete: function() {
							$(sidepop, this).remove();
						}
					});
				} else {
					sideOffset = $(sidepop, this).width()/2 * -1;
					sidepop.style.left = sideOffset - 40;
					anime({
						targets: sidepop,
						easing: 'linear',
						delay: 1500,
						duration: 300,
						opacity: 0,
						scale: 0.5,
						complete: function() {
							$(sidepop, this).remove();
						}
					});
				}
			}
			
			// Crit effect
			if (player.displaycrit == true && config.critBlip) {
				player.displaycrit = false;
				let critwave1 = document.createElement('div');
				critwave1.setAttribute('id', 'crit' + player.divID + Date.now());
				critwave1.setAttribute('class', 'critline');
				critwave1.style.width = '5px';
				critwave1.style.height = '100%';
				critwave1.style.top = 0;
				critwave1.style.opacity = 0.8;
				
				if (config.layoutHorizontal) {
					critwave1.style.left = '0';
					document.getElementById(player.divID).getElementsByClassName('player-effect-cont')[0].appendChild(critwave1);
					anime({
						targets: critwave1,
						easing: 'easeOutQuart',
						duration: 1000,
						left: '100%',
						complete: function() {
							$(critwave1, this).remove();
						}
					});
				} else {
					critwave1.style.right = '0';
					document.getElementById(player.divID).getElementsByClassName('player-effect-cont')[0].appendChild(critwave1);
					anime({
						targets: critwave1,
						easing: 'easeOutQuart',
						duration: 1000,
						right: '100%',
						complete: function() {
							$(critwave1, this).remove();
						}
					});
				}
			}
		}
		
		// Dead
		if (player.state == "dead") {
			player.state = "alive";
			if (config.deathColor) {
				let playerRGBA = player.divRGBA;
				let playerRGBA_ = player.divRGBA_;
				let playerRGBA__ = player.divRGBA__;
				eleA.getElementsByClassName('player-dps-bar')[0].style.background = 'rgba(200, 200, 200, ' + config.playerAlpha + ')';
				eleA.getElementsByClassName('player-effect-cont')[0].style.boxShadow = 'inset 0 0 10px rgba(200, 200, 200, ' + config.playerAlpha + ')';
				eleA.style.background = 'rgba(0,0,0,' + config.playerAlpha + ')';
				
				var deathColors = {
					col1: 'rgba(200, 200, 200, ' + config.playerAlpha + ')',
					col2: 'rgba(200, 200, 200, ' + config.playerAlpha + ')',
					col3: 'rgba(0, 0, 0, ' + config.playerAlpha + ')'
				}
				anime({
					targets: deathColors,
					easing: 'linear',
					delay: 2000,
					duration: 3000,
					col1: playerRGBA,
					col2: playerRGBA_,
					col3: playerRGBA__,
					update: function(a) {
						var val1 = a.animations[0].currentValue;
						var val2 = a.animations[1].currentValue;
						var val3 = a.animations[2].currentValue;
						eleA.getElementsByClassName('player-dps-bar')[0].style.background = val1;
						eleA.getElementsByClassName('player-effect-cont')[0].style.boxShadow = 'inset 0 0 10px ' + val2;
						eleA.style.background = val3;
					}
				});
			}
			
			if (config.deathShake) {
				eleA.style.transform = 'rotate(2deg)';
				var shake = anime.timeline({
					easing: 'linear',
					duration: 50
				});
				
				shake
				.add({
					targets: eleA,
					rotate: '-2deg'
				})
				.add({
					targets: eleA,
					rotate: '1deg'
				})
				.add({
					targets: eleA,
					rotate: '-1.6deg'
				})
				.add({
					targets: eleA,
					rotate: '0.5deg'
				})
				.add({
					targets: eleA,
					rotate: '-0.5deg'
				})
				.add({
					targets: eleA,
					rotate: '0deg'
				});
			}
			
			if (config.deathBlood) {
				for (let i = 0; i < 3; i++) {
					var num = Math.floor(Math.random() * eleA.clientWidth);
					var numw = Math.floor(Math.random() * (60 - 5 + 1) + 5);
					var numh = Math.floor(Math.random() * (eleA.clientHeight - 5 + 1) + 5);
					let splat = document.createElement('div');
					splat.setAttribute('id', player.divID + num + Date.now());
					splat.setAttribute('class', 'bloodsplat-slim');
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
					
					anime({
						targets: splat,
						easing: 'linear',
						delay: 2000,
						duration: 3000,
						opacity: '0',
						complete: function() {
							$(splat, this).remove();
						}
					});
				}
			}
		}
		
		// Always animate sorting
		var divHeight = 20;
		var divOffset = 0;
		var curOffset = 0;
		var raidOffset = parseInt(d);
		
		if (raid24 && config.layoutVertical) {
			// do nothing
		} else if (raid24 && !config.layoutVertical) {
			if (encounter.players.length > 16) {
				raidOffset = parseInt(d) - (encounter.players.length - 9) + 1;
			} else {
				raidOffset = parseInt(d) - (encounter.players.length - 9);
			}
		}
		
		if (config.layoutVertical) {
			divOffset = (raidOffset * divHeight) + (raidOffset * 2) + 2;
			// Quickly sort if back in top8
			if (!player.top8) {
				eleA.style.top = divOffset + 'px';
				player.top8 = true; // Now in top8
			}
			curOffset = eleA.style.top;
		} else {
			divOffset = (raidOffset * divHeight) + (raidOffset * 2) + 2;
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
				anime({
					targets: eleA,
					easing: 'linear',
					duration: 200,
					top: divOffset + 'px'
				});
			} else {
				anime({
					targets: eleA,
					easing: 'linear',
					duration: 200,
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
				anime({
					targets: eleA,
					easing: 'linear',
					duration: 200,
					left: '0',
					complete: function() {
						player.state = "alive";
						eleA.style.left = '0';
					}
				});
			} else {
				anime({
					targets: eleA,
					easing: 'linear',
					duration: 200,
					right: '0',
					complete: function() {
						player.state = "alive";
						eleA.style.right = '0';
					}
				});
			}
		}
	}
}

function animateDiv24(player, d) {
	if (config.style == 'Skye') {
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
			if (config.layoutHorizontal) {
				$('#' + player.divID + ' .player-dps-bar').css('left', '0');
			} else {
				$('#' + player.divID + ' .player-dps-bar').css('right', '0');
			}
			$('#' + player.divID + ' .player-class-icon').css('right', '0');
			$('#' + player.divID + ' .player-class-icon').css('top', '0');
			$('#' + player.divID + ' .player-class-icon').css('width', '30px');
			$('#' + player.divID + ' .player-class-icon').css('height', '30px');
			$('#' + player.divID + ' .player-class-icon').css('font-size', '30px');
			
			// Change name
			$('#' + player.divID + ' .player-name').text(player.name2);
					
			player.top8 = false; // No longer top8
		}
		
		// Update relevant data
		var dpsbarwidth = (parseFloat(player.dps)/encounter.topDamage) * 100;
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
			if (encounter.players.length > 16 && dint < (encounter.players.length - 16)) {
				raidOffsetY = 0;
			} else if (encounter.players.length > 16) {
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
			var flip = encounter.players.length;
			if (dint > 15) {
				flip = flip - 17;
				raidOffsetX = dint - 16;
			} else {
				if (encounter.players.length > 16) {
					flip = (flip - 9) - (flip - 16);
				} else {
					flip = flip - 9;
				}
				raidOffsetX = dint - 8;
			}
			// We need to flip raidOffetX
			raidOffsetX = flip - raidOffsetX;
		} else {
			var flip = encounter.players.length;
			if (dint > 7) {
				flip = flip - 9;
				raidOffsetX = dint - 8;
			} else {
				if (encounter.players.length > 16) {
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
	
	// Slim
	if (config.style == 'Slim') {
		let ele24 = document.getElementById(player.divID);
		// Was this player previously in the top8?
		if (player.top8) {
			// Hide unimportant data
			$('#' + player.divID + ' .player-stat.crit').hide();
			$('#' + player.divID + ' .player-stat.dhit').hide();
			$('#' + player.divID + ' .player-stat.critdhit').hide();
			$('#' + player.divID + ' .player-stat.deaths').hide();
			
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
			$('#' + player.divID + ' .player-dps-slim').addClass('player-dps-slim-24');
			$('#' + player.divID + ' .player-icon-slim').addClass('player-icon-slim-24');
			$('#' + player.divID + ' .player-name-slim').addClass('player-name-slim-24');
			
			if (config.layoutHorizontal) {
				$('#' + player.divID + ' .player-dps-bar').css('left', '0');
			} else {
				$('#' + player.divID + ' .player-dps-bar').css('right', '0');
			}
			
			// Hide name
			$('#' + player.divID + ' .player-name-slim').text('');
					
			player.top8 = false; // No longer top8
		}
		
		// Update relevant data
		var dpsbarwidth = (parseFloat(player.dps)/encounter.topDamage) * 100;
		$('#' + player.divID + ' .player-dps-bar').width(dpsbarwidth + '%');
		$('#' + player.divID + ' .player-dps-slim').text(player.dpsbase);
		if (config.enableTooltip24) {
			$('#' + player.divID + ' .tt-crit').text(player.crit);
			$('#' + player.divID + ' .tt-dhit').text(player.dhit);
			$('#' + player.divID + ' .tt-critdhit').text(player.critdhit);
			$('#' + player.divID + ' .tt-deaths').text(player.deaths);
			$('#' + player.divID + ' .tt-maxhit').html(player.maxhit + '<br />' + player.maxhitnum);
		}
		
		// Beyond 8, containers are moved instantly and are not animated
		
		// Y Offset
		var divHeight = 20;
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
			if (encounter.players.length > 16 && dint < (encounter.players.length - 16)) {
				raidOffsetY = 0;
			} else if (encounter.players.length > 16) {
				raidOffsetY = 1;
			}
		}
		
		if (config.layoutVertical) {
			divOffsetY = (raidOffsetY * divHeight) + (raidOffsetY * 2) + 2;
			curOffsetY = ele24.style.top;
		} else {
			divOffsetY = (raidOffsetY * divHeight) + (raidOffsetY * 2) + 2;
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
			var flip = encounter.players.length;
			if (dint > 15) {
				flip = flip - 17;
				raidOffsetX = dint - 16;
			} else {
				if (encounter.players.length > 16) {
					flip = (flip - 9) - (flip - 16);
				} else {
					flip = flip - 9;
				}
				raidOffsetX = dint - 8;
			}
			// We need to flip raidOffetX
			raidOffsetX = flip - raidOffsetX;
		} else {
			var flip = encounter.players.length;
			if (dint > 7) {
				flip = flip - 9;
				raidOffsetX = dint - 8;
			} else {
				if (encounter.players.length > 16) {
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
}

function showResultScreen() {
	// Work around, current animations will complete but not fire off events (Perfect really)
	anime.running.forEach(function(e){
		e.completed = true;
	});
	
	// Create the results container
	let rEle = document.createElement("div");
	rEle.setAttribute('id', 'result-cont');
	document.body.appendChild(rEle);
	
	// Which result screens to fire off
	let resultQueue = -1;
	let resultScreen = '';
	
	// Counter for loops
	let resultLoop = 0;
	
	// Events
	let rbEvent = new Event('resultsBackgroundEvent'); // Background Anim/Creations
	let rpEvent = new Event('resultsProcessEvent'); // Determine which results screen to process
	let rtEvent = new Event('resultsTopEvent'); // Top results event
				
	// Create encounter complete elements
	var rtEle1 = document.createElement("div");
	rtEle1.setAttribute('class', 'result-ec-title');
	rtEle1.innerHTML = 'encounter';
	rtEle1.style.left = '0';
	rtEle1.style.top = 'calc(50% - 35px)';
	document.getElementById('result-cont').appendChild(rtEle1);
	var rtEle2 = document.createElement("div");
	rtEle2.setAttribute('class', 'result-ec-title');
	rtEle2.innerHTML = 'complete';
	rtEle2.style.right = '0';
	rtEle2.style.top = 'calc(50% - 10px)';
	document.getElementById('result-cont').appendChild(rtEle2);
	
	// Encounter complete animation
	anime({
		targets: rtEle2,
		easing: 'easeOutBack',
		opacity: 1,
		duration: 800,
		right: '117'
	});
	anime({
		targets: rtEle1,
		easing: 'easeOutBack',
		opacity: 1,
		duration: 800,
		left: '97',
		complete: function() {
			rEle.dispatchEvent(rbEvent);
			anime({
				targets: rtEle2,
				easing: 'easeInCubic',
				opacity: 0,
				delay: 1000,
				duration: 500,
				right: '217',
				complete: function() {
					$(rtEle2, this).remove();
				}
			});
			anime({
				targets: rtEle1,
				easing: 'easeInCubic',
				opacity: 0,
				delay: 1000,
				duration: 500,
				left: '197',
				complete: function() {
					$(rtEle1, this).remove();
				}
			});
		}
	});
	
	// Results background event/animation
	rEle.addEventListener('resultsBackgroundEvent', function (e) { 
		for (var rb1 = 0; rb1 < 10; rb1++) {
			for (var rb2 = 0; rb2 < 10; rb2++) {
				var rbEle = document.createElement("div");
				rbEle.setAttribute('class', 'result-block');
				rbEle.style.top = 40 * rb1;
				rbEle.style.left = 40 * rb2;
				
				if (rb1 == 0 && rb2 == 0) {
					rbEle.style.borderTopLeftRadius = '20px';
				}
				if (rb1 == 0 && rb2 == 9) {
					rbEle.style.borderTopRightRadius = '20px';
				}
				if (rb1 == 9 && rb2 == 0) {
					rbEle.style.borderBottomLeftRadius = '20px';
				}
				if (rb1 == 9 && rb2 == 9) {
					rbEle.style.borderBottomRightRadius = '20px';
				}
				
				rbEle.style.transform = 'scale(0)';
				document.getElementById('result-cont').appendChild(rbEle);
			}
		}
		
		anime({
			targets: '.result-block',
			scale: 1,
			easing: 'easeInOutQuad',
			delay: anime.stagger(50, {grid: [10, 10], from: 'center'}),
			complete: function() {
				try {
					$('.result-block').remove(); // Remove all the animated blocks
					let sbEle = document.createElement("div");
					sbEle.setAttribute('id', 'result-s-block');
					document.getElementById('result-cont').appendChild(sbEle); // This should happen so quickly that it's not noticed
					rEle.dispatchEvent(rpEvent); // Process next event
				} catch(e) {
					// throw
				}
			}
		});
	}, false);
	
	// Process events function
	rEle.addEventListener('resultsProcessEvent', function (e) {		
		//Try sanitizing what's next
		anime.remove('#result-screen-cont');
		$('#result-screen-cont').remove(); // Remove this screen
		
		// Queue processing
		resultQueue++;
		if (resultQueue > config.resultsScreenList.length - 1) {
			resultQueue = 0;
			resultLoop++;
			if (resultLoop > config.resultsScreenLoop - 1 && config.resultsScreenLoop != 0) {
				try {
					anime.remove('#result-cont');
					$('#result-cont').remove(); // Remove this screen
				} catch(e) {
					//throw
				}
			}
		}
		resultScreen = config.resultsScreenList[resultQueue];
		
		// Top type screens
		var topScreens = config.resultsScreenList;
		
		try {
			if (topScreens.indexOf(resultScreen) > -1)  rEle.dispatchEvent(rtEvent); // Fire a Top Screen
		} catch(e) {
			// throw
		}
	}, false);
	
	// Show Top event function, muti-use
	rEle.addEventListener('resultsTopEvent', function (e) { 		
		// local array to store and use player data
		let pdata = [];
		for (let pde in encounter.players) {
			if (resultScreen == 'DPS' && encounter.players[pde].dps == 0) continue;
			if (resultScreen == 'HPS' && encounter.players[pde].hps == 0) continue;
			if (resultScreen == 'Maximum Hit' && encounter.players[pde].maxhitnum == 0) continue;
			if (resultScreen == 'Deaths' && encounter.players[pde].deaths == 0) continue;
			if (resultScreen == 'Critical%' && encounter.players[pde].crit == '0%') continue;
			if (resultScreen == 'Direct Hit%' && encounter.players[pde].dhit == '0%') continue;
			if (resultScreen == 'Crit Direct Hit%' && encounter.players[pde].critdhit == '0%') continue;
			if (resultScreen == 'Blocked%' && encounter.players[pde].blockpct == '0%') continue;
			if (resultScreen == 'Parried%' && encounter.players[pde].parrypct == '0%') continue;
			if (resultScreen == 'Damage Taken' && encounter.players[pde].damagetaken == 0) continue;
			if (encounter.players[pde].role == 'limit break') continue; // Skip limit breaks
			pdata.push(encounter.players[pde]);
		}
				
		// Sort
		pdata.sort(function(a, b) {
			function getPctValue(s) { return s.match(/\d+/) || 0; }
			if (resultScreen == 'DPS') return a.dps - b.dps;
			if (resultScreen == 'HPS') return a.hps - b.hps;
			if (resultScreen == 'Maximum Hit') return a.maxhitnum - b.maxhitnum;
			if (resultScreen == 'Deaths') return a.deaths - b.deaths;
			if (resultScreen == 'Critical%') return getPctValue(a.crit) - getPctValue(b.crit);
			if (resultScreen == 'Direct Hit%') return getPctValue(a.dhit) - getPctValue(b.dhit);
			if (resultScreen == 'Crit Direct Hit%') return getPctValue(a.critdhit) - getPctValue(b.critdhit);
			if (resultScreen == 'Blocked%') return getPctValue(a.blockpct) - getPctValue(b.blockpct);
			if (resultScreen == 'Parried%') return getPctValue(a.parrypct) - getPctValue(b.parrypct);
			if (resultScreen == 'Damage Taken') return a.damagetaken - b.damagetaken;
		});
		pdata.reverse();
		
		// Screen specific variables
		let rtitle;
		if (resultScreen == 'DPS') rtitle = 'top damage (dps)';
		if (resultScreen == 'HPS') rtitle = 'top healing (hps)';
		if (resultScreen == 'Maximum Hit') rtitle = 'top maximum hit';
		if (resultScreen == 'Deaths') rtitle = 'top deaths';
		if (resultScreen == 'Critical%') rtitle = 'top critical hits%';
		if (resultScreen == 'Direct Hit%') rtitle = 'top direct hits%';
		if (resultScreen == 'Crit Direct Hit%') rtitle = 'top crit direct hits%';
		if (resultScreen == 'Blocked%') rtitle = 'top blocked%';
		if (resultScreen == 'Parried%') rtitle = 'top parried%';
		if (resultScreen == 'Damage Taken') rtitle = 'top damage taken';
		
		// Make yet another container
		let rsbEle = document.createElement("div");
		rsbEle.setAttribute('id', 'result-screen-cont');
		document.getElementById('result-s-block').appendChild(rsbEle);
		
		//Attempt to remove any animations already running
		anime.remove(rsbEle);
		
		// Title
		let rtEle = document.createElement("div");
		rtEle.setAttribute('class', 'result-title');
		rtEle.innerHTML = rtitle;
		document.getElementById('result-screen-cont').appendChild(rtEle);
		anime({
			targets: rtEle,
			easing: 'linear',
			duration: 1000,
			opacity: 1,
			top: 0
		});
		
		// Loop through pdata and create/animate all elements
		// First element is highest/biggest
		for (let p in pdata) {
			let pEle = document.createElement("div");
			
			let rnum1;
			let rnum2;			
			if (resultScreen == 'DPS') {
				rnum1 = pdata[p].dpsbase;
				rnum2 = pdata[p].damage;
			}
			if (resultScreen == 'HPS') {
				rnum1 = pdata[p].hps;
				rnum2 = pdata[p].healed;
			}
			if (resultScreen == 'Maximum Hit') {
				rnum1 = pdata[p].maxhitnum;
				rnum2 = pdata[p].maxhit;
			}
			if (resultScreen == 'Deaths') {
				rnum1 = pdata[p].deaths;
				rnum2 = '';
			}
			if (resultScreen == 'Critical%') {
				rnum1 = pdata[p].crit;
				rnum2 = pdata[p].crithits;
			}
			if (resultScreen == 'Direct Hit%') {
				rnum1 = pdata[p].dhit;
				rnum2 = pdata[p].dhits;
			}
			if (resultScreen == 'Crit Direct Hit%') {
				rnum1 = pdata[p].critdhit;
				rnum2 = pdata[p].critdhits;
			}
			if (resultScreen == 'Blocked%') {
				rnum1 = pdata[p].blockpct;
				rnum2 = '';
			}
			if (resultScreen == 'Parried%') {
				rnum1 = pdata[p].parrypct;
				rnum2 = '';
			}
			if (resultScreen == 'Damage Taken') {
				rnum1 = pdata[p].damagetaken;
				rnum2 = '';
			}
			
			// Formatting rules for player amounts
			let pscale = 1;
			if (pdata.length ==  1) {
				pEle.style.top = '50%';
				pEle.style.right = '50%';
				pEle.style.transform = 'translate(50%, -50%) scale(0)';
				pscale =  1.55;
			}
			if (pdata.length ==  2) {
				if (p == 0) {
					pEle.style.top = 60;
					pEle.style.right = '50%';
					pEle.style.transform = 'translate(50%) scale(0)';
					pscale =  1.35;
				}
				if (p == 1) {
					pEle.style.top = 240;
					pEle.style.right = '50%';
					pEle.style.transform = 'translate(50%) scale(0)';
					pscale =  1;
				}
			}
			if (pdata.length ==  3) {
				if (p == 0) {
					pEle.style.top = 60;
					pEle.style.right = '50%';
					pEle.style.transform = 'translate(50%) scale(0)';
					pscale =  1.35;
				}
				if (p == 1) {
					pEle.style.top = 240;
					pEle.style.left = '-6%';
					pEle.style.transform = 'scale(0)';
					pscale =  0.8;
				}
				if (p == 2) {
					pEle.style.top = 240;
					pEle.style.left = '44%';
					pEle.style.transform = 'scale(0)';
					pscale =  0.8;
				}
			}
			if (pdata.length ==  4) {
				if (p == 0) {
					pEle.style.top = 28;
					pEle.style.right = '50%';
					pEle.style.transform = 'translate(50%) scale(0)';
					pscale =  0.95;
				}
				if (p == 1) {
					pEle.style.top = 159;
					pEle.style.left = '-6%';
					pEle.style.transform = 'scale(0)';
					pscale =  0.8;
				}
				if (p == 2) {
					pEle.style.top = 159;
					pEle.style.left = '44%';
					pEle.style.transform = 'scale(0)';
					pscale =  0.8;
				}
				if (p == 3) {
					pEle.style.top = 272;
					pEle.style.right = '50%';
					pEle.style.transform = 'translate(50%) scale(0)';
					pscale =  0.7;
				}
			}
			if (pdata.length >  4) {
				if (p == 0) {
					pEle.style.top = 32;
					pEle.style.right = '50%';
					pEle.style.transform = 'translate(50%) scale(0)';
					pscale =  1;
				}
				if (p == 1) {
					pEle.style.top = 170;
					pEle.style.left = '-6%';
					pEle.style.transform = 'scale(0)';
					pscale =  0.8;
				}
				if (p == 2) {
					pEle.style.top = 170;
					pEle.style.left = '44%';
					pEle.style.transform = 'scale(0)';
					pscale =  0.8;
				}
			}
			
			if ((p < 4 && pdata.length < 5) || (p < 3 && pdata.length > 4)) {
				pEle.setAttribute('class', 'result-player-cont');
				var pEleHTML = '';
				
				pEleHTML += '<div style="opacity: 0.4;">';
				if (p < 3) {
					pEleHTML += '<div class="result-player-icon icon-rank' + (parseInt(p) + 1) + '"></div>';
				}
				pEleHTML += '<div class="result-player-icon icon-' + pdata[p].job + '" style="zoom: 0.8;"></div>';
				pEleHTML += '</div>';
				pEleHTML += '<div class="result-center-cont" style="top: 15%;">';
				pEleHTML += '<div class="result-player-name">' + pdata[p].dispname + '</div>';
				pEleHTML += '<div class="result-namejob-hr"></div>';
				pEleHTML += '<div class="result-player-job">' + pdata[p].jobname.toUpperCase() + '</div>';
				pEleHTML += '</div>';
				pEleHTML += '<div class="result-player-num"></div>';
				pEleHTML += '<div class="result-player-num2"></div>';
				
				pEle.innerHTML += pEleHTML;
				document.getElementById('result-screen-cont').appendChild(pEle);
				
				// Stagger/delay animations
				anime({
					targets: pEle,
					opacity: 1,
					easing: 'linear',
					delay: 500 * p,
					duration: 200
				});
				
				anime({
					targets: pEle,
					scale: pscale,
					easing: 'easeOutBack',
					delay: 500 * p,
					duration: 500
				});
				
				// Number "animation", also staggered
				let numAnim = {
					pnum1: 0,
					pnum2: 0
				}
				
				anime({
					targets: numAnim,
					delay: 500 * p,
					duration: 2500,
					pnum1: rnum1,
					pnum2: rnum2,
					easing: 'easeOutQuart',
					round: 1,
					update: function(a) {
						pEle.getElementsByClassName('result-player-num')[0].innerHTML = a.animations[0].currentValue;
						pEle.getElementsByClassName('result-player-num2')[0].innerHTML = a.animations[1].currentValue;
						if (resultScreen == 'Maximum Hit' || resultScreen == 'Deaths' || resultScreen == 'Blocked%' || resultScreen == 'Parried%' || resultScreen == 'Damage Taken') {
							pEle.getElementsByClassName('result-player-num2')[0].innerHTML = rnum2;
						}
					}
				});
			} else if (p > 2 && pdata.length > 4) {
				pEle.setAttribute('class', 'result-player-cont-sm');
				var pEleHTML = '';
				
				pEleHTML += '<div class="result-player-icon-sm icon-' + pdata[p].job + '"></div>';
				pEleHTML += '<div class="result-player-rank-sm">' + (parseInt(p) + 1) + '.</div>';
				pEleHTML += '<div class="result-player-name-sm">' + pdata[p].dispname + '</div>';
				pEleHTML += '<div class="result-player-num-sm">' + rnum1 + '</div>';
				
				pEle.innerHTML += pEleHTML;
				document.getElementById('result-screen-cont').appendChild(pEle);
				
				var pDelay = 1150;
				anime({
					targets: pEle,
					bottom: 110,
					easing: 'linear',
					delay: pDelay * p,
					duration: 5000
				});
		
				let pAnim = anime.timeline({
					easing: 'linear'
				});

				pAnim
				.add({
					targets: pEle,
					opacity: 1,
					delay: pDelay * p,
					duration: pDelay
				})
				.add({
					targets: pEle,
					opacity: 0,
					easing: 'linear',
					delay: pDelay * 2,
					duration: pDelay
				});
			}
		}
		
		// Final delay/trigger
		var fDelay = 3000;
		var fDuration = 1000;
		if (pdata.length < 5) {
			fDelay += 500 * pdata.length;
		} else {
			fDelay += 1150 * (pdata.length - 4);
			fDelay += 5000;
		}
		if (pdata.length < 1) { // Skip screen if there's nothing to show!
			fDelay = 0;
			fDuration = 0;
		}
		anime({
			targets: rsbEle,
			opacity: 0,
			easing: 'linear',
			delay: fDelay,
			duration: fDuration,
			complete: function(e) {
				rEle.dispatchEvent(rpEvent); // Process next event
			}
		});
	}, false);
}








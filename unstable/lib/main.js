'use strict';

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

var ctx = document.getElementById('graph').getContext('2d');
var graphCanvas = new Chart(ctx, 
	{
		type: 'line',
		data: {
			labels: [1],
			datasets: [{
				data: [0],
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

// Import theme
$.getScript('lib/theme-thresher.js');

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
	graphhtml += '<span class="span-absolute" style="left: 2; top: 0;">Total DPS: ' + encounterDPS + '</span>';
	graphhtml += '<span class="span-absolute" style="left: 2; bottom: 0;">Time: ' + data.Encounter['duration'] + '</span>';
	graphhtml += '<span class="span-absolute" style="right: 2; top: 0; text-align: right;">' + data.Encounter['title'] + '</span>';
	ele.innerHTML = graphhtml;

	// Is the data gate primed?
	if (!activeGate) {
		activeGate = true;
		
		// Clear the ui
		var ele = document.getElementById('main');
		while (ele.firstChild) {
			ele.removeChild(ele.firstChild);
		}
		
		graphCanvas.clear();
		graphCanvas.destroy();
		$('#graph').remove();
		$('#graph-cont').append('<canvas id="graph" height="50" width="100%"><canvas>');
		ctx = document.getElementById('graph').getContext('2d');
		graphCanvas = new Chart(ctx, 
			{
				type: 'line',
				data: {
					labels: [1],
					datasets: [{
						data: [0],
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
		graphCanvas.update();
		
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
	}
	
	//if (true) {
	if (data.isActive) {
		// Check for new players
		for (let e in data.Combatant) {
			let entry = data.Combatant[e];
			if (inArrayKey(players, 'name', entry['name']) == false && Player.isValid(entry)) {
				// Make a new player entry
				let newPlayer = new Player(entry);
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
				}
			}
			createDiv(newPlayer);
			players.push(newPlayer);
		}
		
		// Update then sort players
		topDamage = 0;
		for (let p in players) {
			players[p].update(data.Combatant);
			if (parseFloat(players[p].dps) > topDamage) topDamage = parseFloat(players[p].dps);
		}
		players.sort(function(a, b) {
			return a.dps - b.dps;
		});
		if (config.layoutVertical) players.reverse();
		
		// Animation
		for (let d in players) {
			// Animate
			animateDiv(players[d]);
			
			// Graph updates
			if (players[d].name == "YOU" && players[d].dpsGraph.length % 3 === 0) {
				var graphx = players[d].dpsGraph.length;
				var graphy = players[d].dpsGraph[graphx-1];
				graphCanvas.data.labels.push(graphx);
				graphCanvas.data.datasets.forEach((dataset) => {
					dataset.data.push(graphy);
				});
				graphCanvas.update();
				
			}
		}
	} else {
		// Show menu items during combat
		if (config.hideMenu) {
			document.getElementById('menu').style.display = 'block';
			document.getElementById('graph-html').style.width = 'calc(100% - 26px)';
			document.getElementById('graph-cont').style.width = 'calc(100% - 26px)';
		}
	
		activeGate = false;
		players.length = 0;
		players = [];
	}
}

function inArrayKey(array, key, value) {
	try{
		for (var i = 0; i < array.length; i++) {
			if (array[i][key] === value) {
				return array[i];
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

// Hide and show handle
document.addEventListener("onOverlayStateUpdate", function (e) {
	if (!e.detail.isLocked) {
		document.documentElement.classList.add("resizeHandle");
	} else {
		document.documentElement.classList.remove("resizeHandle");
	}
});
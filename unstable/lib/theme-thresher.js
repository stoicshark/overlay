'use_strict';
// createDiv(player)
// animateDiv(player)

export function createDiv(player) {
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
	newEle.style.background = 'linear-gradient(90deg, ' + player.divRGBA + ' 0%, ' + player.divRGBA__ + ' 50%)';
	newEle.style.boxShadow = '2px 3px 4px rgba(0, 0, 0, ' + config.playerAlpha + ')';
	newEle.style.color = config.playerTextColor;

	var eleHTML = '';

	eleHTML += '<div class="player-effect-cont" style="box-shadow: inset 0 0 10px ' + player.divRGBA_ + ';"><div class="player-class-img" style="background-image: url(images/' + player.job + '.png);"></div></div>';
	eleHTML += '<span class="player-name">' + player.name + '</span>';
	eleHTML += '<span class="player-dps-base" style="color: ' + config.playerDPSColor + '">' + player.dpsbase + '</span><span class="player-dps-dec" style="color: ' + config.playerDPSColor + '">.' + player.dpsdec + '</span>';
	eleHTML += '<span class="player-stat crit" style="left: 25%; bottom: 1; margin-left: 3px;">' + player.crit + '</span>';
	eleHTML += '<span class="player-stat dhit" style="left: 40%; bottom: 1; margin-left: 3px;">' + player.dhit + '</span>';
	eleHTML += '<span class="player-stat critdhit" style="left: 55%; bottom: 1; margin-left: 3px;">' + player.critdhit + '</span>';
	eleHTML += '<span class="player-stat deaths" style="left: 70%; bottom: 1; margin-left: 3px;">' + player.deaths + '</span>';
	eleHTML += '<span class="player-stat maxhit" style="right: 0; bottom: 1; margin-right: 5px; text-align: right;">' + player.maxhit + '<br />' + player.maxhitnum + '</span>';
	eleHTML += '<div class="player-dps-bar"></div>';

	newEle.innerHTML = eleHTML;

	document.getElementById('main').appendChild(newEle);

	/*Debug*/
	$('#'+player.divID).click(function(){ 
		//player.displaymaxhit = true;
		//player.displaycrit = true;
		//player.state = 'dead';
	});
}

export function animateDiv(player) {
	// Update div elements
	let ele = document.getElementById(player.divID);
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
			ele.style.background = 'linear-gradient(90deg, rgba(200, 200, 200, ' + config.playerAlpha + ') 0%, rgba(0,0,0,' + config.playerAlpha + ') 50%)';
			ele.getElementsByClassName('player-effect-cont')[0].style.boxShadow = 'inset 0 0 10px rgba(200, 200, 200, ' + config.playerAlpha + ')';
			
			TweenMax.to(ele, 3, {
				background: 'linear-gradient(90deg, ' + playerRGBA + ' 0%, ' + playerRGBA__ + ' 50%)',
				delay: '2'
			});
			TweenMax.to(ele.getElementsByClassName('player-effect-cont')[0], 3, {
				boxShadow: 'inset 0 0 10px ' + playerRGBA_,
				delay: '2'
			});
		}
		
		if (config.deathShake) {
			TweenMax.fromTo(ele, 4, { rotation: 0.5}, {rotation: 0, ease:Elastic.easeOut.config(5, 0.01)});
		}
		
		if (config.deathBlood) {
			for (let i = 0; i < 3; i++) {
			var num = Math.floor(Math.random() * ele.clientWidth);
			var numw = Math.floor(Math.random() * (60 - 5 + 1) + 5);
			var numh = Math.floor(Math.random() * (ele.clientHeight - 5 + 1) + 5);
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
			ele.appendChild(splat);
			
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
	var divOffset = '';
	var curOffset = '';
	
	if (config.layoutVertical) {
		divOffset = (d * divHeight) + (d * 5) + 2;
		curOffset = ele.style.top;
	} else {
		divOffset = (d * divHeight) + (d * 5) + 5;
		curOffset = ele.style.bottom;
	}
	
	if (player.state != "initialize" && curOffset != divOffset) {
		if (config.layoutVertical) {
			TweenMax.to(ele, 0.2, {
				top: divOffset + 'px'
			});
		} else {
			TweenMax.to(ele, 0.2, {
				bottom: divOffset + 'px'
			});
		}
	}
	
	// Initialize and move, not animated
	if (player.state == "initialize") {
		if (config.layoutVertical) {
			ele.style.top = divOffset + 'px';
		} else {
			ele.style.bottom = divOffset + 'px';
		}
		
		if (config.layoutHorizontal) {
			$(ele, this).animate({ // JQuery does this better
				'left': '0'
			}, 200, function(e){
				player.state = "alive";
			});
		} else {
			$(ele, this).animate({ // JQuery does this better
				'right': '0'
			}, 200, function(e){
				player.state = "alive";
			});
		}

		/*TweenMax.to(ele, 0.2, {
			right: '0'
		});
		setTimeout(function(){
			player.state = "alive";
		}, 200);*/
	}
}
var d = document,
	dl = d.location,
	w = window;

if (typeof(safari) == 'object') {
	ping('getStyles', dl.href);
	safari.self.addEventListener("message", pong, false);
	d.addEventListener("stylishInstall", function(event) {pong(event);},false);
	d.addEventListener("stylishUpdate", function(event) {pong(event);},false);
	d.addEventListener('DOMContentLoaded',function(){
		if (getMeta('stylish-id-url')) userstyles();
	});
}

function injectStyle(css,id) {
	if (!dl.host) return;
//	if (w != w.top) return;
	removeStyle(id);
	var regex_timer = /\?timer=(.\d)/gi,
		regex_rnd = /\?rnd=(.\d)/gi,
		time = (new Date()).getTime(),
		timer = function(s,n) {return '?timer='+Math.floor(time/(1000*parseInt(n)))}, // Cahche images for 10 minutes
		rnd = '?rnd='+Math.random(),
		style = d.createElement('style');
	style.setAttribute('id', '' + id);
	style.style.display = 'none !important';
	style.setAttribute('type', 'text/css');
	css = minify_css(css);
	style.innerText = css.replace(regex_timer,timer).replace(regex_rnd,rnd);
	(d.head || d.documentElement).appendChild(style, null);
}

function removeStyle(id) {
	if (e = d.getElementById(''+id)) e.parentNode.removeChild(e);
}

function ping(name, data) {
	safari.self.tab.dispatchMessage(name, data);
}
 
function pong(event) {
	var n = event.name,
		t = event.target,
		m = event.message,
		type = event.type,
		metaid = getMeta('stylish-id-url')?getMeta('stylish-id-url').replace(/^https?:\/\/userstyles.org\/styles\//,''):false;
	switch(n) {
		case 'injectStyle':
			if (m.location == dl.href) injectStyle(m.css,m.id);
		break;
		case 'removeStyle':
			removeStyle(m.id);
			if (m.id == metaid) sendEvent('styleCanBeInstalled');
		break;
		case 'disableStyle':
			removeStyle(m.id);
		break;
		case 'enableStyle':
			ping('applyStyle',{'id':m.id, 'href':dl.href});
		break;
		case 'updateStyle':
			ping('applyStyle',{'id':m.id, 'href':dl.href});
		break;
		case 'checkInstall':
			log(m);
			sendEvent(m?'styleAlreadyInstalled':'styleCanBeInstalled');
		break;
		case 'applyStyle':
			ping('applyStyle',{'id':m.id, 'href':dl.href});
			if (metaid && m.id && m.id == metaid) sendEvent('styleAlreadyInstalled');
		break;
		case 'log':
			console.log('Global: ',m);
		break;
	}
	switch(type) {
		case 'stylishInstall':
			stylishInstallGlobal(metaid);
		break;
		case 'stylishUpdate':
			stylishUpdateGlobal(metaid);
		break;
	}
}

function stylishInstallGlobal(id) {
	ping('installStyle',{
		id:id,
		options:getOptions(true)
	});
};
function stylishUpdateGlobal(id) {
	ping('installStyle',{
		id:id,
		options:getOptions(true)
	});
};
function getOptions(json) {
	var form, new_form = d.createElement('form'), i, options = '';
	if (form = d.getElementById('style-settings')) {
		var old_selects = form.getElementsByTagName('select'),
			new_selects = new_form.getElementsByTagName('select');
		new_form.appendChild(form.cloneNode(true))
		for (i in old_selects) new_selects[i].selectedIndex = old_selects[i].selectedIndex;
		options = serialize(new_form, json);
	}
	return options;
}

function loadScript(src, async) {
	var script = d.createElement('script');
	script.type = 'text/javascript';
	script.src = src;
	if (async) script.async = true;
	d.getElementsByTagName('head')[0].appendChild(script);
};
function loadStyle(src) {
	var link = document.createElement('link');
	link.type = 'text/css';
	link.rel = 'stylesheet';
	link.href = src;
	document.getElementsByTagName('head')[0].appendChild(link);
};

function log(l) {
	console.log('injected: ',l);
};

function userstyles() {
	var sid = getMeta('stylish-id-url').replace(/^https?:\/\/userstyles.org\/styles\//,'');
	ping('checkInstall',sid);
};

function sendEvent(name) {
	var event = d.createEvent("Events");
	event.initEvent(name, false, false, d.defaultView, null);
	d.dispatchEvent(event);
};

function getMeta(name) {
	var m = d.getElementsByTagName('link');
	for (var i in m) {
		if (m[i].rel == name) {
			return m[i].href;
		}
	}
	return false;
}

function serialize(form, as_json) {
	var i, j, el, q = [], n, v, t, elements, options, json = {};
	function add_value(name, value) {
		q.push(name+'='+value);
		json[name] = value;
	}
	if (!form || !form.nodeName || form.nodeName.toLowerCase() !== 'form') throw 'You must supply a form element';
	elements = form.elements;
	for (i in elements) {
		if (typeof(el = elements[i]) !== 'object' || el.disabled) continue;
		n = el.name;
		v = el.value;
		t = el.type;
		switch (el.nodeName.toLowerCase()) {
			case 'input':
				switch (t) {
					case 'checkbox':
					case 'radio':
						if (el.checked) add_value(n,v);
					break;
					case 'reset':
					break;
					default:
						add_value(n,v);
					break;
				}
			break;
			case 'textarea':
				add_value(n,v);
			break;
			case 'select':
				switch(t) {
					case 'select-one':
						add_value(n,v);
					break;
					case 'select-multiple':
						options = el.options;
						for (j in options) if (options[j].selected) add_value(n, options[j].value);
					break;
				}
			break;
			case 'button':
				switch (t) {
					case 'reset':
					case 'submit':
					case 'button':
						add_value(n,v);
					break;
				}
			break;
		}
	}
	return as_json ? json : q.join('&');
}

function minify_css(css){
	var before = css.length,
		after;
	css = cssmin(css);
	after = css.length;
	//log('Optimized by: '+Math.round(100-after*100/before)+'%');
	return css;
}

/**
 * cssmin.js
 * Author: Stoyan Stefanov - http://phpied.com/
 * This is a JavaScript port of the CSS minification tool
 * distributed with YUICompressor, itself a port 
 * of the cssmin utility by Isaac Schlueter - http://foohack.com/ 
 * Permission is hereby granted to use the JavaScript version under the same
 * conditions as the YUICompressor (original YUICompressor note below).
 */
 
/*
* YUI Compressor
* Author: Julien Lecomte - http://www.julienlecomte.net/
* Copyright (c) 2009 Yahoo! Inc. All rights reserved.
* The copyrights embodied in the content of this file are licensed
* by Yahoo! Inc. under the BSD (revised) open source license.
*/

function cssmin(e,r){var a=0,c=0,s=!1,l=!1,_=0,i=0,t=[],n="";for(e=e.replace(/("([^\\"]|\\.|\\)*")|('([^\\']|\\.|\\)*')/g,function(e){var r=e[0];return t.push(e.slice(1,-1)),r+"___YUICSSMIN_PRESERVED_TOKEN_"+(t.length-1)+"___"+r});(a=e.indexOf("/*",a))>=0;)l=e.length>a+2&&"!"===e[a+2],c=e.indexOf("*/",a+2),0>c?l||(e=e.slice(0,a)):c>=a+2&&("\\"===e[c-1]?(e=e.slice(0,a)+"/*\\*/"+e.slice(c+2),a+=5,s=!0):s&&!l?(e=e.slice(0,a)+"/**/"+e.slice(c+2),a+=4,s=!1):l?(n=e.slice(a+3,c),t.push(n),e=e.slice(0,a+2)+"___YUICSSMIN_PRESERVED_TOKEN_"+(t.length-1)+"___"+e.slice(c),s&&(s=!1),a+=2):e=e.slice(0,a)+e.slice(c+2));if(e=e.replace(/\s+/g," "),e=e.replace(/(^|\})(([^\{:])+:)+([^\{]*\{)/g,function(e){return e.replace(":","___YUICSSMIN_PSEUDOCLASSCOLON___")}),e=e.replace(/\s+([!{};:>+\(\)\],])/g,"$1"),e=e.replace(/___YUICSSMIN_PSEUDOCLASSCOLON___/g,":"),e=e.replace(/:first-(line|letter)({|,)/g,":first-$1 $2"),e=e.replace(/\*\/ /g,"*/"),e=e.replace(/^(.*)(@charset "[^"]*";)/gi,"$2$1"),e=e.replace(/^(\s*@charset [^;]+;\s*)+/gi,"$1"),e=e.replace(/\band\(/gi,"and ("),e=e.replace(/([!{}:;>+\(\[,])\s+/g,"$1"),e=e.replace(/;+}/g,"}"),e=e.replace(/([\s:])(0)(px|em|%|in|cm|mm|pc|pt|ex)/gi,"$1$2"),e=e.replace(/:0 0 0 0;/g,":0;"),e=e.replace(/:0 0 0;/g,":0;"),e=e.replace(/:0 0;/g,":0;"),e=e.replace(/background-position:0;/gi,"background-position:0 0;"),e=e.replace(/(:|\s)0+\.(\d+)/g,"$1.$2"),e=e.replace(/rgb\s*\(\s*([0-9,\s]+)\s*\)/gi,function(){for(var e=arguments[1].split(","),r=0;r<e.length;r++)e[r]=parseInt(e[r],10).toString(16),1===e[r].length&&(e[r]="0"+e[r]);return"#"+e.join("")}),e=e.replace(/([^"'=\s])(\s*)#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])/gi,function(){var e=arguments;return e[3].toLowerCase()===e[4].toLowerCase()&&e[5].toLowerCase()===e[6].toLowerCase()&&e[7].toLowerCase()===e[8].toLowerCase()?(e[1]+e[2]+"#"+e[3]+e[5]+e[7]).toLowerCase():e[0].toLowerCase()}),e=e.replace(/[^\};\{\/]+\{\}/g,""),r>=0)for(a=0,_=0;_<e.length;)"}"===e[_++]&&_-a>r&&(e=e.slice(0,_)+"\n"+e.slice(_),a=_);for(e=e.replace(/;;+/g,";"),_=0,i=t.length;i>_;_++)e=e.replace("___YUICSSMIN_PRESERVED_TOKEN_"+_+"___",t[_]);return e=e.replace(/^\s+|\s+$/g,"")};

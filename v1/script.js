var canvas, ctx, sx, sy, binM, imgData, data, bank, scnI;
var loadingImage = false;
var marginTop = 95;
var delta_y = 18;
var cell_sx = 11;
var cell_sy = 13;
var nImg = 61;
var colInfo = [
	{start_x: 143, limit_x: 521},
	{start_x: 651, limit_x: 729},
	{start_x: 900, limit_x: 978}
];

bank = {};

function toDoc() {
	var fixStr = s => {
		s = s.toString();
		if (s.indexOf(",") < 0 && s.indexOf('"') < 0) return s;
		var r = "";
		var c;
		for (var i=0; i<s.length; ++i) {
			c = s[i];
			if (c === '"') {
				c += '"';
			}
			r += c;
		}
		return '"' + r + '"';
	};
	var fixPrice = s => {
		s = s.replace("R$", "");
		s = s.replace(",", ".");
		if (!s) return "<Erro!>";
		return parseFloat(s);
	};
	var fixQtd = s => {
		if (!s) return "<Erro!>";
		s = parseFloat(s);
		return s < 0 ? 0 : s;
	};
	var row;
	var array = [];
	for (var att in bank) {
		var row = bank[att];
		var a2 = fixQtd(row[1]);
		if (a2 === 0) continue;
		var a1 = fixPrice(row[0]);
		var str = fixStr(att) + "," + fixStr(a1) + "," + fixStr(a2);
		array.push({
			key: att.toUpperCase(),
			str: str,
		});
	}
	array.sort((a,b)=>a.key>b.key);
	document.body.innerHTML = "";
	for (var i=0; i<array.length; ++i) {
		var div = document.createElement("div");
		div.innerText = array[i].str;
		document.body.appendChild(div);
	}
}

scnI = {
	imgId: 0,
	rowIndex: 0,
	error: false,
	endOfPage: true,
	y: marginTop,
	colIndex: null,
	x: null,
	buffer: "",
	row: [],
	key: "",
	begin_x: null,
	limit_y: Infinity
};

var maskArrayToStrnig = (array, i) => {
	var n = array.length;
	if (i >= n) {
		return null;
	}
	var code = "";
	var res = null;
	for (; i < n; ++i) {
		if (code) code += ":";
		code += array[i];
		var str = dict[code];
		if (!str) continue;
		if (i + 1 >= array.length) return str;
		var aft = maskArrayToStrnig(array, i + 1);
		res = str + aft;
	}
	return res;
};

var initRowScann = _ => {
	scnI.colIndex = 0;
	scnI.y = marginTop + delta_y*scnI.rowIndex;
	initColScann();
};
var initColScann = _ => {
	var i = scnI.colIndex;
	scnI.x = colInfo[i].start_x;
};
var loadImgSrc = (src, callback) => {
	loadingImage = true;
	var img = document.createElement("img");
	img.onload = e => {
		img.remove();
		sx = canvas.width = img.width;
		sy = canvas.height = img.height;
		ctx.drawImage(img, 0, 0, sx, sy);
		imgData = ctx.getImageData(0, 0, sx, sy);
		data = imgData.data;
		loadingImage = false;
		callback();
	};
	img.src = src;
	document.body.appendChild(img);
};
var displayImageData = _ => {
	ctx.putImageData(imgData, 0, 0);
};
var removeBlueLine = _ => {
	for (var i=0; i<sy; ++i) {
		for (var j=0; j<sx; ++j) {
			var ri = (i*sx + j) << 2;
			var gi = ri + 1;
			var bi = gi + 1;
			var r = data[ri];
			var g = data[gi];
			var b = data[bi];
			if (r > 60 || g < 100 || g > 160 || b < 200) {
				continue;
			}
			data[ri] = 255;
			data[gi] = 255;
			data[bi] = 254;
			for (var di=-1; di<=1; ++di) {
				for (var dj=-1; dj<=1; ++dj) {
					var ri = ((i + di)*sx + (j + dj)) << 2;
					var gi = ri + 1;
					var bi = gi + 1;
					if (data[ri] + data[gi] + data[bi] === 255*3) {
						data[ri] = data[gi] = data[bi] = 0;
					}
				}
			}
		}
	}
};
var binarize = _ => {
	binM = new Array(sy);
	for (var i=0; i<sy; ++i) {
		var row = new Array(sx);
		binM[i] = row;
		for (var j=0; j<sx; ++j) {
			var ri = (i*sx + j) << 2;
			var gi = ri + 1;
			var bi = gi + 1;
			var sum = data[ri] + data[gi] + data[bi];
			row[j] = (sum < 600) - 0;
			data[ri] = data[gi] = data[bi] = row[j]*30;
		}
	}
};
var unknownCode = "";
var colors = ["#012", "#05a", "#024", "#07f"];
var scannCol = (x, y) => {
	var mask = 0;
	for (var i=y, e=y+cell_sy; i<e; ++i) {
		var bit = binM[i][x];
		mask = (mask << 1) | bit;
		// ctx.fillStyle = colors[(x&1)*2 + bit];
		// ctx.fillRect(x, i, 1, 1);
	}
	return mask;
}
var handleEndCol = _ => {
	var str = scnI.buffer.trim();
	if (scnI.colIndex === 0) {
		scnI.key = str;
		if (str === "") {
			scnI.limit_y = scnI.y;
		}
	} else {
		scnI.row.push(str);
	}
	scnI.buffer = "";
	if (++ scnI.colIndex >= colInfo.length) {
		handleEndRow();
	} else {
		initColScann();
	}
};
var handleEndRow = _ => {
	scnI.rowIndex ++;
	if (scnI.key) {
		bank[scnI.key] = scnI.row;
	}
	scnI.row = [];
	initRowScann();
	scnI.endOfPage = scnI.y >= scnI.limit_y;
};
var scannNextCell = () => {
	var x = scnI.x;
	var y = scnI.y;
	var mask;
	var space = 0;
	var limit = colInfo[scnI.colIndex].limit_x;
	while (x < limit && (mask = scannCol(x, y)) === 0) {
		++ x;
		++ space;
	}
	if (!mask) {
		handleEndCol();
		return;
	}
	var code = mask.toString(16);
	scnI.begin_x = x;
	var width = 1;
	while (++x < limit) {
		var prev = mask;
		mask = scannCol(x, y);
		var a = prev | (prev << 1) | (prev << 2);
		var b = mask << 1;
		if ((a & b) === 0) {
			break;
		}
		code += ":" + mask.toString(16);
		++ width;
	}
	scnI.width = width;
	var str = dict[code];
	if (!str) {
		str = maskArrayToStrnig(code.split(":"), 0);
	}
	if (!str) {
		scnI.error = true;
		unknownCode = code;
		return;
	}
	if (space > 2) {
		scnI.buffer += " ";
	}
	scnI.buffer += str;
	scnI.x = x + (str === "1")*2;
};

var nSteps = 10;
var intervalCode = null;
var start = _ => {
	stop();
	intervalCode = setInterval(_=>{
		for (var i=0; i<nSteps; ++i) step();
	}, 0);
};
var stop = _ => {
	if (intervalCode !== null) {
		clearInterval(intervalCode);
		intervalCode = null;
	}
};

function nextImage() {
	scnI.endOfPage = false;
	scnI.imgId ++;
	if (scnI.imgId > nImg) {
		toDoc();
		return stop();
	}
	scnI.rowIndex = 0;
	initRowScann();
	loadImgSrc("img" + scnI.imgId + ".png", _ => {
		removeBlueLine();
		binarize();
		displayImageData();
	});
}

function highlightError() {
	ctx.lineWidth = 1;
	var x = scnI.begin_x - 0.5;
	var y = scnI.y - 0.5;
	ctx.strokeStyle = "#000";
	ctx.beginPath();
	ctx.rect(x, y, scnI.width + 1, cell_sy + 1);
	ctx.stroke();
	ctx.strokeStyle = "#fb0";
	ctx.beginPath();
	ctx.rect(x - 1, y - 1, scnI.width + 3, cell_sy + 3);
	ctx.stroke();
}

function step() {
	if (scnI.error) {
		stop();
		highlightError();
		return;
	}
	if (loadingImage) {
		return;
	}
	if (scnI.endOfPage) {
		return nextImage();
	}
	scannNextCell();
}

window.onkeydown = e => {
	var key = e.key.toLowerCase();
	if (key === "\n" || key === "enter") {
		var txt = (prompt("")||"").trim();
		if (!txt) return;
		dict[unknownCode] = txt;
		scnI.error = false;
		start();
		return;
	}
	if (key === " ") {
		e.preventDefault();
		e.stopPropagation();
		var str = "var dict = {\n";
		for (var att in dict) {
			str += "\t\"" + att + "\": " + JSON.stringify(dict[att]) + ",\n";
		}
		console.clear();
		console.log(str + "};");
		return;
	}
};

function checkMarks() {
	displayImageData();
	function rect(x, y, sx, sy) {
		ctx.fillStyle = "rgba(0, 192, 255, 0.75)";
		ctx.fillRect(x, y, sx, sy);
	}
	var y = marginTop;
	for (var i=colInfo.length; i--;) {
		var info = colInfo[i];
		var x = info.start_x;
		var sx = info.limit_x - x;
		rect(x - 2, y - 2, sx + 4, cell_sy + 4);
	}
}

window.addEventListener("load", _=>{
	canvas = document.querySelector("canvas");
	ctx = canvas.getContext("2d");
	start();
});

var save = name => {
	var item = window[name];
	window.localStorage.setItem(name, JSON.stringify(item));
};

var load = name => {
	var json = window.localStorage.getItem(name);
	if (!json) return false;
	window[name] = JSON.parse(json);
};

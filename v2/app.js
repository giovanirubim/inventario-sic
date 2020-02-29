const fs = require('fs');
const http = require('http');
const parseUrl = require('url').parse;

const webRoot = './web';
const port = 80;

const getMime = path => {
	path = path.substr(path.lastIndexOf('.') + 1);
	return {
		js: 'application/javascript',
		json: 'application/json',
		html: 'text/html',
		css: 'text/css',
		glsl: 'text/plain',
		png: 'image/css',
	}[path] || 'application/octet-stream'
};
const routKey = (type, path) => `${type}: ${path}`;

class Request {
	constructor(req, res) {
		const {
			query, pathname
		} = parseUrl(req.url, true);
		this.req = req;
		this.res = res;
		this.path = pathname;
		this.query = query;
		this.type = req.method;
		this.key = routKey(req.method, pathname);
		this.body = null;
		let body = '';
		req.on('data', data => body += data.toString('utf8'));
		req.on('end', () => {
			this.body = parseUrl('/?'+body, true).query;
			const {onload} = this;
			if (onload) onload();
		});
	}
	json(value) {
		const {res} = this;
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify(value));
		return this;
	}
	ready(onload) {
		this.onload = onload;
		return this;
	}
}

const routs = {};
const app = http.createServer((req, res) => {
	
	const obj = new Request(req, res);
	const key = routKey(obj.type, obj.path);

	const rout = routs[key];
	if (rout) {
		try {
			obj.ready(() => rout(obj));
		} catch(e) {
			console.error(e);
			res.writeHead(500);
			res.end();
		}
		return;
	}

	let {path} = obj;
	
	if (path === '/') path += 'index.html';
	path = webRoot + path;
	
	if (!fs.existsSync(path)) {
		res.writeHead(404);
		res.end();
		return;
	}
	
	try {
		const file = fs.readFileSync(path);
		res.writeHead(200, {'Content-Type': getMime(path)});
		res.end(file);
	} catch(e) {
		res.writeHead(500);
		res.end();
	}

});
const get = (path, handler) => {
	const key = routKey('GET', path);
	routs[key] = handler;
};

get('/nImages', req => {
	const arr = fs.readdirSync('./web/screenshots/');
	req.json(arr.length);
});

app.listen(port, () => {
	console.log('Server started at port ' + port);
});
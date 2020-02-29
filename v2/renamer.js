const fs = require('fs');
const root = './web/screenshots/';
fs.readdirSync(root).forEach((name, i) => {
	let prevName = name;
	let nextName = (i + 1) + '.png';
	if (prevName !== nextName) {
		fs.renameSync(root + prevName, root + nextName);
	}
});

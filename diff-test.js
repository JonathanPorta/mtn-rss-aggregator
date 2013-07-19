var spawn = require('child_process').spawn;
var fs    = require('fs');

function compareArticle(subj, comp){

	var a = "./a1.txt";
	var b = "./b1.txt";

	fs.writeSync(a, subj.description);
	fs.writeSync(b, comp.description);

	var ls    = spawn('./diff.sh', [a, b]);

	ls.stdout.on('data', function (data) {
	  console.log('stdout: ' + data);
	});

	ls.stderr.on('data', function (data) {
	  console.log('stderr: ' + data);
	});

	ls.on('close', function (code) {
	  console.log('child process exited with code ' + code);
	});
}

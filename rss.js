//RSS Feed Parser Proof of Concept
//
var FeedParser = require('feedparser');
var request = require('request');
var http = require('http');
var mustache = require('mustache');
var fs = require('fs');

var template = "./views/index.mustache";

var urls = {
	'/ktvq'  : "http://ktvq.com/rss",
	'/kxlh'  : "http://www.kxlh.com/rss",
	'/kxlf'  : "http://www.kxlf.com/rss",
	'/kaj18' : "http://www.kaj18.com/rss",
	'/kbzk'  : "http://www.kbzk.com/rss",
	'/kpax'  : "http://www.kpax.com/rss",
	'/krtv'  : "http://www.krtv.com/rss"
};

var _data = {
	'/ktvq'  : {},
	'/kxlh'  : {},
	'/kxlf'  : {},
	'/kaj18' : {},
	'/kbzk'  : {},
	'/kpax'  : {},
	'/krtv'  : {}
}

buildStore();

setInterval(function(){
console.log("Rebuilding Store.")
	buildStore();
}, 300000);

http.createServer(function (req, res) {
	if(urls.hasOwnProperty(req.url))
	{
		var items = [];
		for(var dd in _data[req.url])
			items.push(_data[req.url][dd]);

		fs.readFile(template, function(err, page) {
			res.writeHead(200, {'Content-Type': 'text/html'});
			page = page.toString();
			res.write(mustache.to_html(page, {"items" : items}));
			res.end()
		});
	}
	else if(req.url == "/compare")
	{
		compareArticle(_data['/ktvq']['http://www.ktvq.com/news/bannack-state-park-closed-due-to-mudslide/'], _data['/kbzk']['http://www.kbzk.com/news/flood-rips-through-bannack-upcoming-celebration-cancelled/']);
	}
	else
	{
		res.end('Not Found');
	}

}).listen(1337, 'dev.rurd4me.com');


function buildStore(){
	for(var station in urls)
	{
		getRss(station, urls[station], function(name, item){
			_data[name][item.link] = item;
		});
	}
}


function getRss(feedname, feedurl, cb) {
	request(feedurl).on('error', function (error) {
console.error(error);
	})
	.pipe(new FeedParser())
	.on('error', function (error) {
console.error(error);
	})
	.on('meta', function (meta) {
console.log('===== %s =====', meta.title);
	})
	.on('readable', function() {
		var stream = this, item;
		while (item = stream.read()) {
			cb(feedname, item);
		}
	});
}
//-----------------------------------------------------------

var spawn = require('child_process').spawn;
var fs    = require('fs');

function compareArticle(subj, comp){
console.log("compareArticle");
	var a = "a1.txt";
	var b = "b1.txt";
	var cwd = "./temp/";

	fs.writeFileSync(cwd+a, try_to_sanitize(subj.description));
	fs.writeFileSync(cwd+b, try_to_sanitize(comp.description));

	var ls    = spawn('./diff.sh', [a, b, cwd]);

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

function try_to_sanitize(string){
	string = strip_tags(string, "<br><br/><p></p>");
	string = string.replace(/<\//g,"\n</");
	string = string.replace(/\/>/g, "/>\n");
	string = strip_tags(string);
	return string;
}

function strip_tags (input, allowed) {
  // http://kevin.vanzonneveld.net
  // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   improved by: Luke Godfrey
  // +      input by: Pul
  // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   bugfixed by: Onno Marsman
  // +      input by: Alex
  // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +      input by: Marc Palau
  // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +      input by: Brett Zamir (http://brett-zamir.me)
  // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   bugfixed by: Eric Nagel
  // +      input by: Bobby Drake
  // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   bugfixed by: Tomasz Wesolowski
  // +      input by: Evertjan Garretsen
  // +    revised by: Rafał Kukawski (http://blog.kukawski.pl/)
  // *     example 1: strip_tags('<p>Kevin</p> <br /><b>van</b> <i>Zonneveld</i>', '<i><b>');
  // *     returns 1: 'Kevin <b>van</b> <i>Zonneveld</i>'
  // *     example 2: strip_tags('<p>Kevin <img src="someimage.png" onmouseover="someFunction()">van <i>Zonneveld</i></p>', '<p>');
  // *     returns 2: '<p>Kevin van Zonneveld</p>'
  // *     example 3: strip_tags("<a href='http://kevin.vanzonneveld.net'>Kevin van Zonneveld</a>", "<a>");
  // *     returns 3: '<a href='http://kevin.vanzonneveld.net'>Kevin van Zonneveld</a>'
  // *     example 4: strip_tags('1 < 5 5 > 1');
  // *     returns 4: '1 < 5 5 > 1'
  // *     example 5: strip_tags('1 <br/> 1');
  // *     returns 5: '1  1'
  // *     example 6: strip_tags('1 <br/> 1', '<br>');
  // *     returns 6: '1  1'
  // *     example 7: strip_tags('1 <br/> 1', '<br><br/>');
  // *     returns 7: '1 <br/> 1'
  allowed = (((allowed || "") + "").toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join(''); // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
  var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
    commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
  return input.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
    return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
  });
}

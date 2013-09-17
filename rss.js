//RSS Feed Parser Proof of Concept
//
var FeedParser = require('feedparser');
var request = require('request');
var http = require('http');
var mustache = require('mustache');
var fs = require('fs');
var queryString = require('querystring');
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

var socket_out;

buildStore();

setInterval(function(){
console.log("Rebuilding Store.")
	buildStore();
}, 300000);

http.createServer(function (req, res) {

	var query = queryString.parse(req.url);

	var requestUrl = "";
	var json = false;

//	query.query = query.query || {};
	if(query.hasOwnProperty("/?store"))
	{
		requestUrl = "/"+query['/?store'];
		json = true;
	}
	else
	{
		requestUrl = req.url;
	}

	if(urls.hasOwnProperty(requestUrl))
	{
		var items = [];
		for(var dd in _data[requestUrl])
		{
			if(!dd.hasOwnProperty("matches"))
				dd['matches'] = [];
			_data[requestUrl][dd]['viewDate'] = _data[requestUrl][dd]['date'].toLocaleDateString();
			items.push(_data[requestUrl][dd]);
		}

                items.sort(function(a,b){
                	if (a.date.getTime() > b.date.getTime()) return -1;
                	if (a.date.getTime() < b.date.getTime()) return 1;
                	return 0;
                });

		if(json)
		{
			res.write(JSON.stringify(items));
			res.end();
		}
		else
		{
			fs.readFile(template, function(err, page) {
				res.writeHead(200, {'Content-Type': 'text/html'});
				page = page.toString();
				res.write(mustache.to_html(page, {"items" : items}));
				res.end()
			});
		}
	}
	else if(requestUrl == "/compare")
	{
		//compareArticle(_data['/ktvq']['http://www.ktvq.com/news/bannack-state-park-closed-due-to-mudslide/'], _data['/kbzk']['http://www.kbzk.com/news/flood-rips-through-bannack-upcoming-celebration-cancelled/']);
		runComparison("/ktvq");
	}
	else if(requestUrl == "/refresh")
	{
		buildStore();
	}
	else
	{
		res.end('Not Found');
	}

}).listen(1337, 'dev.rurd4me.com');


var io = require('socket.io').listen(1336);

io.sockets.on('connection', function (socket) {
  socket_out = socket;
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});


function buildStore(){
	for(var station in urls)
	{
		getRss(station, urls[station], function(name, item){
			var matches = [];
			if(_data[name].hasOwnProperty(item.link))
			{
				if(_data[name][item.link].hasOwnProperty('matches'))
					matches = _data[name][item.link]['matches'];
			}	
			else
			{
				if(socket_out)
				{
					socket_out.emit("new", item);
				}
			}
			_data[name][item.link] = item;
			_data[name][item.link]['matches'] = matches;
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
var sha1  = require('sha1');
var _comparisonQueue = [];
var _currentComparison = null;
var _hashes = {};
var cwd = "./temp/";

function runComparison(mainFeed){
	console.log("Preparing to run comparisons for " + mainFeed);
	if(_data.hasOwnProperty(mainFeed))
	{	
		var mainItems = _data[mainFeed];
		for(var mainItem in mainItems)
		{
			for(var otherFeed in _data)
			{
				if(otherFeed == mainFeed)
					continue;
				var otherItems = _data[otherFeed];
				for(var otherItem in otherItems)
				{
					compareArticle(_data[mainFeed][mainItem], _data[otherFeed][otherItem]);
				}
			}
		}
	}
}

function compareArticle(subj, comp){
//console.log("compareArticle");
	var h1 = sha1(subj.link + comp.link);
	var h2 = sha1(comp.link + subj.link);
	if(!_hashes.hasOwnProperty(h1) && !_hashes.hasOwnProperty(h2))
	{
		_comparisonQueue.push({"subj":subj, "comp":comp});
		_hashes[h1] = true;
		_hashes[h2] = true;
		doCompare();
	}
	else
	{
		console.log("Already in Queue!");
	}
}

function doCompare(){
console.log(_comparisonQueue.length + " items in queue.");
	if(!_currentComparison && _comparisonQueue.length > 0)
	{	//queue should be free
		_currentComparison = _comparisonQueue.pop();
		var hash = sha1(_currentComparison.subj.link + _currentComparison.comp.link);
		var a = hash + ".subj";
		var b = hash + ".comp";

		if(!_currentComparison.subj.hasOwnProperty("matches"))
			_currentComparison.subj['matches'] = [];

		if(!_currentComparison.comp.hasOwnProperty("matches"))
			_currentComparison.comp['matches'] = [];

		fs.writeFileSync(cwd+a, try_to_sanitize(_currentComparison.subj.description));
		fs.writeFileSync(cwd+b, try_to_sanitize(_currentComparison.comp.description));

		var ls = spawn('./diff.sh', [a, b, cwd, hash]);

		ls.stdout.on('data', function (data) {
			//console.log("Raw Output: " + data);
			var rounded = (Math.round(data*10000)/10000);
			//console.log("Rounded: " + rounded);
			if(rounded > .5)
			{
				_currentComparison.subj['matches'].push(_currentComparison.comp);
				_currentComparison.comp['matches'].push(_currentComparison.subj);
			}
//		  console.log('stdout: ' + data);
//		  _currentComparison.subj
  		  _currentComparison = null;
		  doCompare();

		});

		ls.stderr.on('data', function (data) {
		  console.log('stderr: ' + data);
//  		  _currentComparison = null;
//		  doCompare();
		});

		ls.on('close', function (code) {
		  //console.log('child process exited with code ' + code);
		  //console.log('Advancing queue');
//  		  _currentComparison = null;
//		  doCompare();
		});
	}
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

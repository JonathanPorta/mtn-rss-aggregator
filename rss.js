//RSS Feed Parser Proof of Concept
//
var FeedParser = require('feedparser');
var request = require('request');
var http = require('http');

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

http.createServer(function (req, res) {
	res.writeHead(200, {'Content-Type': 'text/html'});
	if(urls.hasOwnProperty(req.url))
	{
		res.write("<ul>");
		for(var dd in _data[req.url])
		{
			var item = _data[req.url][dd];
			var line = "<li><a style='font-size:.6em;'  target='_blank' href='"+item['link']+"'>"+item['title']+"</a></li>";
			res.write(line);
		}
		res.end("</ul>");
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

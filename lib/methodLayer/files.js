var urlB = require("../modules/urlBuilder").build
var qs = require('querystring')
var fs = require('fs')
var crypto = require('crypto')
var stream = require('stream')
var util = require('util')

// pass = needs id but can 'pass' query with object instead (along with id).
// data + id needs seperate object and id value.
// id = only need to pass id value
// query = can pass query
// all with query have default values

var MultiPartREGEX = {
	boundary : /boundary=([\-0-9a-fA-F]+)/gm,
	contentType : /Content-Type:\s*(.*);/igm,
  fileName : /content\-disposition:.*;\sfilename="(.*)"/igm,
  parentID : /content\-disposition:.*;\sname="parent_id";*\n*(\d*)/igm,
  data : "£\n.*\n.*\n\n([\.\n]*)£"

}
getData = function (input,regex){
	var result = regex.exec(input)
	return result
}

getFileData = function(boundary,data){
	var beginsAt = 0
	var endsAt = 0
	var dataArray = data.match(/^.*([\n\r]+|$)/gm)
	for(var i=0;i<dataArray.length;i++){
		switch(true){
			case dataArray[i].match(MultiPartREGEX.fileName) !== null:
				switch(dataArray[i+1].match('Content-Type:')){
					case null:
						beginsAt = i + 1
			  	break
			  default:
			  	beginsAt = i + 2
		  	break
			  }
			break
			case (dataArray[i].match(boundary) !== null):
				if(beginsAt !== 0 && i > beginsAt){
					endsAt = i
				}
			break
		}
		if(beginsAt !== 0 && endsAt !== 0){
			break
		}
	}
	var result = dataArray.slice(beginsAt, endsAt).join('')
	return result
}

parseMultiPart = function (data) {
	// console.log(mp.initWithBoundary(data))
	var result = {}
	var boundary = getData(data,MultiPartREGEX.boundary)[1]
	var dataregex = replaceAll('£',boundary,MultiPartREGEX.data)
	dataregex = new RegExp(dataregex,"igm")
	result = {
		fileName : getData(data,MultiPartREGEX.fileName)[1],
		parent_id : getData(data,MultiPartREGEX.parentID)[1],
		data : getFileData(boundary,data)
	}
	return result
}
var defaultQuery = {
				min_height : 256,
				min_width : 256
}

function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}
function getHash (file, callback){
	var fd = fs.createReadStream(file)
	var hash = crypto.createHash('sha1')
	hash.setEncoding('hex')

	fd.on('end', function() {
	    hash.end()
	    callback(hash.read()) // the desired sha1sum
	});
}

exports.getInfomation = function (client,id,callback) {
	var path = urlB.host('api').object('files',id).url
	client.get(path,callback)
}

exports.updateInfomation = function (client,data,id,callback) {
	var path = urlB.host('api').object('files',id).url
	client.post(path,data,callback)
}

exports.get = function (client,id,callback) {
	var path = urlB.host('api').object('files',id).action('content').url
	client.get(path,callback)
}



uploadWrapper = function (client, file, callback) {

	cback = function (path, file, callback) {
		client.upload(path, file, callback)
	}
	upload = function (client, file, callback) {
		var npipe = true;
		var path = urlB.host('upload').object('files', file.id).action('content').url;
		stream.Writable.call(this);
		this.on('pipe', function () {
			npipe = false
		});

		this.end = function () {
			if (typeof this.data !== 'undefined') {
				file.data = Buffer.concat(this.data);
				cback(path, file, callback);
			}
		};

		process.nextTick(function () {
			if (npipe) {
				cback(path, file, callback);
			}
		})

	};
	util.inherits(upload, stream.Writable);

	upload.prototype._write = function (chunk, encoding, callback) {
		if(typeof this.data === 'undefined'){
			this.data = [];
		}
		this.data.push(chunk);
		callback()
	};

	return new upload(client, file, callback);
};

exports.upload = uploadWrapper;

exports.delete = function (client,id,callback) {
	var path = urlb.host('api').object('files',id).url
	client.delete(path,callback)
}

exports.getVersionInfomation = function (client,id,callback) {
	var path = urlb.host('api').object('files',id).action('versions').url
	client.get(path,callback)
}

exports.promoteOldVersion = function (client, data, id ,callback) {
	var path = urlB.host('api').object('files',id).action('versions').action('current').url
	client.post(path,data,callback)
}

exports.deleteOldVersion = function (client,id,version_id,callback){
	var path = urlB.host('api').object('files',id).action('version',version_id).url
  client.delete(path,callback)
}

exports.copy = function (client,data,id,callback){
	var path = urlB.host('api').object('files',id).action('copy').url
	client.post(path,data,callback)
}

exports.getThumbnail = function (client, pass, callback) {
  var path = urlB.host('api').object('files', pass.pass || pass).action('thumbnail').url + '?' +
  qs.stringify(pass.query || defaultQuery)
  client.get(path,callback)
}

exports.createSharedLink = function (client,data,id,callback) {
	var path = urlB.host('api').object('files',id).url
	client.put(path,data,callback)
}

exports.getTrashed = function (client,id,callback) {
	var path = urlB.host('api').object('files',id).url
	client.get(path,callback)
}

exports.permanantlyDelete = function (client,id,callback) {
	var path = urlB.host('api').object('files',id).action('trash').url
	client.delete(path,callback)
}

exports.restoreTrashed = function (client,data,id,callback) {
	var path = urlB.host('api').object('files',id).url
	client.post(path,data,callback)
}

exports.viewComments = function (client,data,id,callback) {
	var path = urlB.host('api').object('files',id).action('comments').url
	client.get(path,callback)
}

exports.getTasks = function (client,id,callback) {
	var path = urlB.host('api').object('files',id).action('tasks').url
	client.get(path,callback)
}
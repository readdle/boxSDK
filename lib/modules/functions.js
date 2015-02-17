var request = require("request");
var crypto = require("crypto");
var fs = require('fs');
var qs = require('querystring');

function replaceAll(find, replace, str) {
    return str.replace(new RegExp(find, 'g'), replace);
}

makeRequest = function (setStreamCallback, path, data, headers, method, waitUntilDate, NewTokensCallback, onDataReceiveCallback, undefined) {

    var waitUntilTime = waitUntilDate.getTime();
    var now = Date.now();

    if (waitUntilTime > now) {
        //console.log("[RATE:IN]\t%d,\tpat: %s", (waitUntilTime - now)/1000, path);
        setTimeout(function () {
            //console.log("[RATE:DONE]\tpath: %s", path);
            makeRequest(setStreamCallback, path, data, headers, method, waitUntilDate, NewTokensCallback, onDataReceiveCallback);
        }, waitUntilTime - now);
        return;
    }

    var options = {
        method: method,
        url: path,
        headers: headers
    };
    if (Object.prototype.toString.call(data) === '[object Array]') {
        options.multipart = data;
    } else {
        options.body = data;
    }

    options.pool = {maxSockets: 10};
    options.encoding = null;
    //options.proxy = 'http://192.168.7.14:8888';
    //options.strictSSL = false;

    var requestCallback = undefined;

    if(typeof onDataReceiveCallback !== 'undefined'){
        requestCallback = function(error, response, body){
            switch (true) {
                case(typeof body == 'object'):
                    onDataReceiveCallback(body, response.statusCode);
                    break;
                case(typeof body == 'string'):
                    onDataReceiveCallback(body, response.statusCode);
                    break;
            }
        }
    }

    var stream = request(options, requestCallback).on('response', function (response) {

        // Rate limit exceeded HTTP 429
        if (response.statusCode == 429) {
            var wait = 3;
            if (response.headers['retry-after'] != null) {
                wait = parseInt(response.headers['retry-after'], 10)
            }
            //console.log("[RATE:TRIGGER]\t%d\tpath: %s", wait, options.url);
            waitUntilDate.setTime(Date.now() + wait * 1000);
            makeRequest(setStreamCallback, path, data, headers, method, waitUntilDate, NewTokensCallback, onDataReceiveCallback);
            return;
        }

        if (response.statusCode == 401 && NewTokensCallback != null) {
            var callback = function (newToken){
                headers['Authorization'] = boxAuthHead(newToken);
                makeRequest(setStreamCallback, path, data, headers, method, waitUntilDate, NewTokensCallback, onDataReceiveCallback);
            };
            NewTokensCallback(callback);
            return;
        }
    });

    if(typeof setStreamCallback == 'function') {
        setStreamCallback(stream);
    }
};

uploadFile = function (callb, path, file, headers, waitUntilDate, NewTokensCallback, onRequestDoneCallback) {
    switch (true) {
        case (file.data == null):
            var f = fs.createReadStream(file.filename, {encoding: 'binary'});
            file.data = '';
            f.on('data', function (chunk) {
                file.data = file.data + chunk;
            });
            f.on('end', function () {
                uploadRequest(callb, path, file, headers, waitUntilDate, NewTokensCallback, onRequestDoneCallback);
            });
            break;
        default:
            uploadRequest(callb, path, file, headers, waitUntilDate, NewTokensCallback, onRequestDoneCallback);
    }
};

function uploadRequest(callb, path, file, headers, waitUntilDate, NewTokensCallback, onRequestDoneCallback) {
    var name = file.filename.split('/');
    name = name[name.length - 1];

    var body = file.data;
    if (!body instanceof Buffer) {
        body = new Buffer(body, 'binary');
    }

    var multipart =
        [
            {
                "content-type": 'application/octet-stream',
                "Content-Disposition": 'form-data;' + 'filename="' + name + '";name="filename"',
                body: body
            },
            {
                "Content-Disposition": 'form-data; name="parent_id";',
                body: file.parent_id.toString()
            }
        ];
    makeRequest(callb, path, multipart, headers, 'post', waitUntilDate, NewTokensCallback, onRequestDoneCallback);
}

trueOrFalse = function (input) {
    var result = false;
    if (input == 'true' || input == 'True') {
        result = true;
    }
    return result;
};

setUserObject = function (d) {
    if (typeof d.login == 'undefined' || typeof d.name == 'undefined') return 'error';
    var result = JSON.stringify({
        tracking_codes: [],
        login: d.email,
        name: d.name,
        phone: d.phone || '',
        address: d.address || '',
        role: d.role || '',
        status: d.status || '',
        space: d.space || '',
        is_sync_enabled: trueOrFalse(d.is_sync_enabled) || '',
        can_see_managed_users: trueOrFalse(d.can_see_managed_users) || '',
        is_exempt_from_device_limits: trueOrFalse(d.is_exempt_from_device_limits) || '',
        is_exempt_from_login_verification: trueOrFalse(d.is_exempt_from_login_verification || '')
    });
    return result;
};

getHeaders = function (token, type, content) {

    var result = {};
    switch (type) {
        case 'get':
            result = {
                'Authorization': boxAuthHead(token)
            };
            break;
        case 'post':
            result = {
                'content-type': 'application/x-www-form-urlencoded',
                'Authorization': boxAuthHead(token)
            };
            break;
        case 'upload':
            result = {
                'content-type': 'multipart/form-data',
                'Authorization': boxAuthHead(token)
            };
            break;
        default:
            result = {'content-type': 'application/x-www-form-urlencoded'};
    }
    if (typeof content !== 'undefined' && typeof content.user !== 'undefined' && content.user) result['As-User'] = content.user;
    return result;
};

boxAuthHead = function (header) {
    return 'Bearer {0}'.replace('{0}', header);
};

generate = function () {
    var buf = crypto.randomBytes(256);
    var shasum = crypto.createHash('sha1');
    shasum.update(buf);
    return shasum.digest('hex');
};

exports.makeRequest = makeRequest;
exports.uploadFile = uploadFile;
exports.setUserObject = setUserObject;
exports.generate = generate;
exports.trueOrFalse = trueOrFalse;
exports.getHeaders = getHeaders;
exports.tof = trueOrFalse;
//modules
var urlB = require('./urlBuilder').build;
var func = require('./functions');
//libraries
var http = require("http");
var url = require("url");
var qs = require("querystring");
//

var waitUntilDate = new Date();
waitUntilDate.setTime(0);

var client = {
    appID: "",
    secret: "",
    callbackURL: "",
    aToken: "",
    rToken: "",
    path: "",
    data: "",
    headers: {},
    user: '',
    crypto: func.generate,
    waitUntilDate: waitUntilDate,
    NewTokensCallback: null,

    setup: function (input) {
        this.appID = input.appID;
        this.secret = input.secret;
        if (typeof input.CallbackURL !== 'undefined') {
            this.callbackURL = input.CallbackURL;
        }
        if (typeof input.NewTokensCallback !== 'undefined') {
            this.NewTokensCallback = input.NewTokensCallback;
        }
        return this;
    },
    setTokens: function (acc, reff) {
        this.aToken = acc;
        this.rToken = reff;
        return this
    },
    get: function (path, callb, extraHeader) {
        extraHeader = extraHeader || {};
        var headerKeys = Object.keys(extraHeader);
        for (var i = 0; i < headerKeys.length; i++) {
            this.headers[headerKeys[i]] = extraHeader[i]
        }
        this.path = path;
        this.headers = func.getHeaders(this.aToken, 'get', {user: this.user});
        func.makeRequest(callb, this.path, null, this.headers, 'get', this.waitUntilDate, this.NewTokensCallback);
    },
    post: function (path, data, callb) {
        this.path = path;
        this.headers = func.getHeaders(this.aToken, 'post', {user: this.user});
        this.data = JSON.stringify(data);
        func.makeRequest(callb, this.path, this.data, this.headers, 'post', this.waitUntilDate, this.NewTokensCallback);
    },
    put: function (path, data, callb) {
        this.path = path;
        this.headers = func.getHeaders(this.aToken, 'post', {user: this.user});
        this.data = JSON.stringify(data);
        func.makeRequest(callb, this.path, this.data, this.headers, 'put', this.waitUntilDate, this.NewTokensCallback);
    },
    patch: function (path, data, callb) {
        this.path = path;
        this.headers = func.getHeaders(this.aToken, 'post', {user: this.user});
        this.data = JSON.stringify(data);
        func.makeRequest(callb, this.path, this.data, this.headers, 'patch', this.waitUntilDate, this.NewTokensCallback);
    },
    delete: function (path, callb) {
        this.path = path;
        this.headers = func.getHeaders(this.aToken, 'get', {user: this.user});
        func.makeRequest(callb, this.path, null, this.headers, 'delete', this.waitUntilDate, this.NewTokensCallback);
    },
    upload: function (path, file, callb, onRequestDoneCallback) {
        this.path = path;
        this.headers = func.getHeaders(this.aToken, 'upload', {user: this.user});
        this.data = file;
        func.uploadFile(callb, path, this.data, this.headers, this.waitUntilDate, this.NewTokensCallback, onRequestDoneCallback);
    }
};

exports.client = client;
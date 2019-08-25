var MongoClient = require('mongodb').MongoClient,
    config = require('../configs/config.js'),
    utils = require('../libraries/util.js');

var state = {
    db: null
};

exports.connect = function (url, done) {
    url = url || '';
    var server = config.dbSettings.serverName;
    var port = config.dbSettings.serverPort;
    var dbName = config.dbSettings.databaseName;
    const username = config.dbSettings.username;
    const password = config.dbSettings.password;

    if (state.db) return done();
    utils.cLog('[DB]  ' + utils.getDateTime().toString() + ' Attempting Connection to MongoDB');

    if (!utils.isString(url)){
        url = 'mongodb://';
        if (utils.isString(username) && utils.isString(password)) {
            url = url + encodeURIComponent(username.trim()) + ":" + encodeURIComponent(password.trim()) + "@";
        }
        if (utils.isString(server)) {
            url = url + server;
        }
        if (utils.isString(port)) {
            url = url + ":" + port;
        }
        if (utils.isString(dbName)) {
            url = url + "/" + dbName;
        }
    }

    let options = {
        db: {
            native_parser: false
        },
        server: {
            auto_reconnect: true,
            poolSize: 50,
            ssl: true
        },
        replSet: {
            rs_name: config.dbSettings.replicaSetName
        },
        mongos: {}
    };

    if (!config.environment.isAzure) {
        options = {
            db: {
                native_parser: false
            },
            server: {
                auto_reconnect: true,
                poolSize: 50
            },
            replSet: {},
            mongos: {},
            useNewUrlParser: true,
            useUnifiedTopology: true
        };
    }

    utils.cLog('[DB]  ' + utils.getDateTime().toString() + ' Connecting with MongoDB url: ' + url);

    MongoClient.connect(url, options,
        function (err, db) {
            if (err) {
                utils.cLog('[DB]  Error connecting to MongoDB. ' + err);
                return done(err);
            } else {
                utils.cLog('[DB]  ' + utils.getDateTime().toString() + ' Connected to MongoDB');
                state.db = db;
                done();
            }
        });
}

exports.get = function () {
    return state.db;
};

exports.close = function (done) {
    if (state.db) {
        state.db.close(function (err, result) {
            state.db = null;
            state.mode = null;
            done(err);
        });
    }
};
var config = require('../configs/config.js'),
    utils = require('./util.js'),
    utilsHttp = require('./util.http.js');

module.exports.requireHttps = function (redirect) {
    return function (req, res, next) {
        if (config.global.enforceHttps == true) {
            if (!config.environment.isAzure) {
                next();
            } else {
                var fs = require('fs');
                var path = require('path');

                if (req.headers['x-arr-ssl']) {
                    var clientCert = req.headers['x-arr-clientcert'].trim();

                    fs.readFile('authorizedCert.txt', {
                        root: path.join(__dirname, '../')
                    }, function (err, data) {
                        if (err) {
                            return utils.cLog(err);
                        }
                        var authCert = data.trim();

                        if (clientCert === authCert) {
                            next();
                        } else {
                            utilsHttp.unauthorized(req, res);
                        }
                    });
                } else if (redirect) {
                    res.status(301).redirect('https://' + req.hostname + req.url);
                } else {
                    utilsHttp.notFound(req, res);
                }
            }
        } else {
            next();
        }
    };
};

module.exports.enforceSecurity = function () {
    return function (req, res, next) {
        if (config.global.enforceAuth) {
            utils.cLog(utils.stringify(req.headers));
            if (req.headers['x-api-key'] === config.global.headerKeyValue) {
                return next();
            } else {
                utilsHttp.notFound(req, res);
            }
        } else {
            return next();
        }
    }

};
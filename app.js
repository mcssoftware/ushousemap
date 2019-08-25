require('dotenv').config();
const newrelic = require('newrelic');
const config = require('./configs/config.js');
const express = require('express');
const compression = require("compression");
const app = express();
const server = require('http').createServer(app);
const utils = require('./libraries/util.js');
const MongoConnection = require('./api/dbConnection');
const routes = require('./routes/endpointsSecured');
const favicon = require('serve-favicon');
const path = require('path');

const port = process.env.PORT;

utils.cLog("Listen at port: " + port);

app.set('query parser', 'simple');
app.use(compression());

app.locals.newrelic = newrelic;

app.use('/', routes);

const faciconPath = path.join(__dirname, 'favicon.ico');
utils.cLog("Setup favicon: " + faciconPath);
app.use(favicon(faciconPath));

// ### Error Catching
app.use(function (req, res, next) {
    utils.cLog("[START]  " + JSON.stringify(res || {
        err: ""
    }));
    // res.redirect('/Error/500');
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// Start server
server.listen(port, () => {
    utils.cLog(`Starting up server at: ${new Date()}`, true);
    utils.cLog(`Running server on port ${port}`);

    // ### Connect to DB & Start App
    // --> MongoConnection URL is blank, provide MongoURL to OVERRIDE ONLY
    MongoConnection.connect('', function (err) {
        if (err) {
            utils.cLog("[EB]  " + err);
            // process.exit(1);
        }
    });

});
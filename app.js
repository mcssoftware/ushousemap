require('dotenv').config();
const newrelic = require('newrelic');
const config = require('./configs/config.js');
const express = require('express');
const compression = require("compression");
const app = express();
const server = require('http').createServer(app);
const fs = require('fs');
const utils = require('./libraries/util.js');
const MongoConnection = require('./api/dbConnection');
const routes = require('./routes/endpointsSecured');

const ENV = process.env;

const port = ENV.PORT;

app.set('query parser', 'simple');
app.use(compression());
app.locals.newrelic = newrelic;

app.use('/', routes);

// ### Error Catching
app.use(function (err, req, res, next) {
    utils.cLog("[START]  " + err);
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
            utils.cLog("[START]  " + err);
            // process.exit(1);
        }
    });

});

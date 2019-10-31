require('dotenv').config();
require('newrelic');

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const app = express();
const server = require('http').createServer(app);
const utils = require('./helpers/utils.helpers')();
const cLog = utils.cLog;
const apiRoutes = require('./routes/api.routes');
const latestRoutes = require('./routes/latest.routes');
const pollingService = require('./services/polling/polling')();
const socketContoller = require('./controllers/socket.controller')();

const ENV = process.env;
const port = ENV.PORT;
const requiredENVSettings = [
  'PORT',
  'BASE_API_URL',
  'ROUTE_VOTES',
  'ROUTE_BILLS',
  'ROUTE_MEETINGS',
  'ROUTE_FLOOR',
  'ROUTE_BILLS_THIS_WEEK',
  'ROUTE_MEMBERS',
  'ROUTE_BROADCAST_EVENTS'
];

cLog(`Checking .ENV settings: ${new Date()}`, true);
// Check required .ENV settings
requiredENVSettings.forEach((setting) => {
  if (!ENV[setting.toUpperCase()]) {
    throw new Error(`Missing setting [${setting}] in .ENV file!`);
  }
});

// Middleware
if (ENV.USE_CORS.toLowerCase() === 'true') app.use(cors()); // Allowing CORs requests (TODO: Specify locations?)
// TODO: Probably should lower the limit (defaults to 100kb, which is too small for downloading transcripts)
app.use(bodyParser.json({
  limit: ENV.BODY_PARSER_LIMIT || '100kb'
}));
app.use(bodyParser.urlencoded({
  limit: ENV.BODY_PARSER_LIMIT || '100kb',
  extended: false
}));

// Route paths
app.use('/', apiRoutes);
app.use('/latest', latestRoutes);
app.use('/robots933456.txt',(req, res)=>{
  res.header('Content-Type', 'text/plain');
  res.send('');
});

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  res.status(404);
  var message = 'Not Found: ' + req.url + '; query: ' + req.query;
  console.log(message);
  res.send({ error: message });
  // const err = new Error('Not Found: ' + JSON.stringify(req.query));
  // err.status = 404;
  // next(err);
});

// Start server
server.listen(port, () => {
  cLog(`Starting up server at: ${new Date()}`, true);
  cLog(`Running server on port ${port}`);
  socketContoller.listen(server); // Initialize socket.io instance
  pollingService.start(); // Kick off the API polling process
});
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('cookie-session');

const app = express(),
    DIST_DIR = __dirname,
    HTML_FILE = path.join(DIST_DIR, 'index.html')


app.use(helmet());
//disable X-Powered-By header
app.disable('x-powered-by');

// Set cookie security options
var expiryDate = new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)) // 2 days
app.use(session({
    name: 'session',
    keys: ['Q~T~sf6}{*jW)O{6LJ8$SXi,nM1-ws', '3gWsj4p_ovcPC^~Dm|L4cFjBzoSpSZ'],
    cookie: {
        secure: true,
        httpOnly: true,
        domain: 'liveweb-azapp-prod-eastus2-001.azurewebsites.net',
        path: '/',
        expires: expiryDate
    }
}));

// set Content security policies
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", 'maxcdn.bootstrapcdn.com', 'fonts.googleapis.com', 'amp.azure.net', "'unsafe-inline'"],
        scriptSrc: ["'self'", 'amp.azure.net', 'bam.nr-data.net', 'js-agent.newrelic.com', "'unsafe-inline'"],
        fontSrc: ["'self'", 'amp.azure.net', 'maxcdn.bootstrapcdn.com', 'fonts.gstatic.com'],
        connectSrc: ["'self'", 'bam.nr-data.net', 'liveproxy-azapp-prod-eastus2-001.azurewebsites.net'],
        workerSrc: ["'self'", 'amp.azure.net', "blob:"],
        objectSrc: ["'none'"],
    }
}))

app.use(express.static(DIST_DIR, {
    maxAge: '2 days',
    etag: true,
    setHeaders: function (res, path, stat) {
        res.set('x-timestamp', Date.now())
    }
}));

const PORT = process.env.PORT || 2112
app.listen(PORT, () => {
    console.log(`${new Date().toLocaleString()} App listening to ${PORT}....`)
    console.log('Press Ctrl+C to quit.')
})
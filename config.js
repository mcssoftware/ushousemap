const ENV = process.env;

let logLevel = 'error';
const logLevels = ['error', 'warn', 'info', 'verbose', 'debug'];
if (logLevels.indexOf(ENV.LOGGING_LEVEL) > -1) {
    logLevel = ENV.LOGGING_LEVEL;
}

const excludes = {};
Object.entries((ENV)).filter(a => a.length && (a[0].indexOf('EXCLUDE.') == 0) && (typeof (a[1]) == "string") && (a[1].length != 0)).forEach(a => {
    const key = a[0].split('.')[1].toUpperCase();
    const value = a[1].split(',').map(a => a.trim()).filter(a => a.length > 0);
    excludes[key] = value;
});

module.exports = {
    dbSettings: {
        serverName: ENV.SERVERNAME,
        serverPort: ENV.SERVERPORT,
        replicaSetName: typeof ENV.REPLICASETNAME === "string" ? ENV.REPLICASETNAME : null,
        databaseName: ENV.DATABASENAME,
        username: ENV.DB_USERNAME,
        password: ENV.DB_PASSWORD
    },
    environment: {
        isAzure: /true/i.test(ENV.ISAZURE || ''),
        sysEnv: "development" // development, test, production
    },
    global: {
        timeoutMS: ENV.TIMEOUTMS,
        enforceHttps: /true/i.test(ENV.ENFORCEHTTPS || ''),
        enforceAuth: /true/i.test(ENV.ENFORCEAUTH || ''),
        enablePM2: /true/i.test(ENV.ENABLEPM2 || ''),
        headerKeyValue: ENV.HEADER_KEY,
    },
    response: {
        recordLimit: ENV.RECORDLIMIT,
        accessControl: ENV.ACCESSCONTROL
    },
    excludes,
    // logging settings
    loggingLevel: logLevel
}
var config = {};

config.dbSettings = {};
// Azure DocumentDB
//config.dbSettings.serverName = "clerkdb.documents.azure.com";
//config.dbSettings.serverPort = 10250;
//config.dbSettings.replicaSetName = null;
//config.dbSettings.databaseName = "housedb";
//config.dbSettings.username = "clerkdb";
//config.dbSettings.password = "UAzt6kHP9i5fH6M3CktvmbFESQ5g94Co5TJoZfC2m7J2CSHxwaCtI1ZexO6q2KRIAR7k4bCYLOdVySosAtpapQ==";

// Azure MongoDB
config.dbSettings.serverName = "clerkmdb1.cloudapp.net";
config.dbSettings.serverPort = 27017;
config.dbSettings.replicaSetName = null;
config.dbSettings.databaseName = "HouseDB";
config.dbSettings.username = "Lcsdev";
config.dbSettings.password = "$Booger2015";

config.environment = {};
config.environment.isAzure = true;
config.environment.sysEnv = "development";  // development, test, production

config.global = {};
config.global.timeoutMS = 3000;
config.global.enforceHttps = false;
config.global.enablePM2 = false;

config.response = {};
config.response.recordLimit = 10;
config.response.accessControl = "*";

module.exports = config;
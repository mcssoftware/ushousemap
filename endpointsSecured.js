var express = require('express'),
    router = express.Router(),
    path = require('path'),
    enforce = require('../libraries/enforce'),
    legislativeFunctions = require('../api/legislative.js'),
    utils = require('../libraries/util.js'),
    utilsHttp = require('../libraries/util.http.js');

// Secure Legislative Data Endpoints (Production Ready)
router.get("/", function (req, res) {
    if (req.headers['x-arr-ssl']) {
        res.status(200).json({
            "responseCode": 200,
            "responseMessage": "Welcome to the U.S. House of Representatives -- Office of the Clerk\'s API for Legislative Data."
        });
    } else {
        res.status(200).json({
            "responseCode": 200,
            "responseMessage": "Welcome to the U.S. House of Representatives -- Office of the Clerk\'s API for Legislative Data. Please use SSL/TLS to connect to this service."
        });
    }
});

router.get("/Metadata", function (req, res) {
    res.setHeader("Content-Type", "application/xml");
    res.sendFile('metadata.xml', {
        root: path.join(__dirname, '../metadata')
    });
});

router.get("/Votes", enforce.requireHttps(true), legislativeFunctions.getDocuments);
router.get("/Votes/:id", enforce.requireHttps(true), legislativeFunctions.getDocumentById);

router.get("/Members", enforce.requireHttps(true), legislativeFunctions.getDocuments);
router.get("/Members/:id", enforce.requireHttps(true), legislativeFunctions.getDocumentById);

router.get("/FloorSummaries", enforce.requireHttps(true), legislativeFunctions.getDocuments);
router.get("/FloorSummaries/:id", enforce.requireHttps(true), legislativeFunctions.getDocumentById);

router.get("/Committees", enforce.requireHttps(true), legislativeFunctions.getDocuments);
router.get("/Committees/:id", enforce.requireHttps(true), legislativeFunctions.getDocumentById);

router.get("/CommitteeMeetings", enforce.requireHttps(true), legislativeFunctions.getDocuments);
router.get("/CommitteeMeetings/:id", enforce.requireHttps(true), legislativeFunctions.getDocumentById);

router.get("/DischargePetitions", enforce.requireHttps(true), legislativeFunctions.getDocuments);
router.get("/DischargePetitions/:id", enforce.requireHttps(true), legislativeFunctions.getDocumentById);

router.get("/FloorSchedules", enforce.requireHttps(true), legislativeFunctions.getDocuments);
router.get("/FloorSchedules/:id", enforce.requireHttps(true), legislativeFunctions.getDocumentById);

router.get("/Bills", enforce.requireHttps(true), legislativeFunctions.getDocuments);
router.get("/Bills/:id", enforce.requireHttps(true), legislativeFunctions.getDocumentById);

router.get("/MISMembers", enforce.requireHttps(true), legislativeFunctions.getDocuments);
router.get("/MISMembers/:id", enforce.requireHttps(true), legislativeFunctions.getDocumentById);

router.get("/BroadcastEvents", enforce.requireHttps(true), legislativeFunctions.getDocuments);
router.get("/BroadcastEvents/:id", enforce.requireHttps(true), legislativeFunctions.getDocumentById);

router.get("/Error", function (req, res) {
    utilsHttp.notFound(req, res)
});
router.get("/Error/404", function (req, res) {
    utilsHttp.notFound(req, res)
});
router.get("/Error/415", function (req, res) {
    utilsHttp.notSupported(req, res)
});
router.get("/Error/500", function (req, res) {
    utilsHttp.serverError(req, res)
});
router.get("/Error/503", function (req, res) {
    utilsHttp.notAvailable(req, res)
});

router.get(function (req, res) {
    utilsHttp.notFound(req, res);
});

module.exports = router;
var config = require('../configs/config.js'),
    utils = require('../libraries/util.js'),
    utilsHttp = require('../libraries/util.http.js'),
    breezeMongo = require('breeze-mongodb'),
    js2xml = require('js2xmlparser');
var nr = require('newrelic');

module.exports.getDocuments = function (request, response, next) {
    var db = require('./dbConnection');
    var collectionName = getCollectionName(request.url.toLowerCase());
    nr.startBackgroundTransaction('Get Documents from ' + (collectionName || '').toUpperCase(), 'Calling MONGO DB', function transactionHandler() {
        var transaction = nr.getTransaction();

        if (request.query.$top > config.response.recordLimit || !request.query.$top) {
            request.query.$top = config.response.recordLimit;
        }
        if (!request.query.$inlinecount) {
            request.query.$inlinecount = true;
        }

        utils.cLog.verbose("DB: collection : " + collectionName + " request query: " + utils.stringify(request.query));

        var query = new breezeMongo.MongoQuery(request.query);
        query.select = {...query.select, ...getExcludesField(collectionName)};

        query.execute(db.get(), collectionName, function (error, results) {
            transaction.end();
            if (!error) {
                utils.cLog.debug("Received results from MongoDB.");
                if (results != null) {
                    responseMetadata(request, response, results, next);
                } else {
                    utilsHttp.notFound(request, response);
                }
            } else {
                utils.cLog.error("Error while getting data from mongo");
                const errormsg = utils.stringify(error || {});
                utils.cLog.error(errormsg);
                next(errormsg);
            }
        });
    });
};

module.exports.getDocumentById = function (request, response) {
    var db = require('./dbConnection');
    var id = request.params.id;
    var collectionName = getCollectionName(request.url.toLowerCase());

    nr.startBackgroundTransaction('Get Document by ID from ' + (collectionName || '').toUpperCase(), 'Calling MONGO DB', function transactionHandler() {
        var transaction = nr.getTransaction();
        if (!request.query.$inlinecount) {
            request.query.$inlinecount = true;
        }

        utils.cLog.verbose("[HIT] Collection: " + collectionName + ", ID: " + id + " w/ Request=" + request.url);

        var query = new breezeMongo.MongoQuery(request.query);
        if (config.excludes && Array.isArray(config.excludes[collectionName.toUpperCase()])) {
            config.excludes[collectionName.toUpperCase()].forEach(fld => {
                query.filter[fld] = 0;
            });
        }

        query.execute(db.get(), collectionName, function (error, results, next) {
            transaction.end();
            if (!error) {
                if (results != null) {
                    responseMetadata(request, response, results, next);
                } else {
                    utilsHttp.notFound(request, response);
                }
            } else {
                const errormsg = utils.stringify(error || {});
                utils.cLog.error("[ERROR] " + errormsg);
                next(errormsg);
            }
        });
    });
};

function getCollectionName(requestUrl) {
    var collectionName = "";
    var requestUrlParsed = "";

    if (requestUrl.indexOf("?") > -1) {
        var urlSplit = requestUrl.split('?');
        requestUrlParsed = urlSplit[0];
    } else {
        requestUrlParsed = requestUrl;
    }

    if (requestUrlParsed.indexOf("/votes") > -1) {
        collectionName = "Votes";
    } else if (requestUrlParsed.indexOf("/members") > -1) {
        collectionName = "Member";
    } else if (requestUrlParsed.indexOf("/floorsummaries") > -1) {
        collectionName = "FloorSummaries";
    } else if (requestUrlParsed.indexOf("/committeemeetings") > -1) {
        collectionName = "CommitteeMeetings";
    } else if (requestUrlParsed.indexOf("/committees") > -1) {
        collectionName = "Committees";
    } else if (requestUrlParsed.indexOf("/dischargepetitions") > -1) {
        collectionName = "DischargePetitions";
    } else if (requestUrlParsed.indexOf("/floorschedules") > -1) {
        collectionName = "FloorSchedules";
    } else if (requestUrlParsed.indexOf("/bills") > -1) {
        collectionName = "Bills";
    } else if (requestUrlParsed.indexOf("/mismembers") > -1) {
        collectionName = "Members";
    } else if (requestUrlParsed.indexOf("/broadcastevents") > -1) {
        collectionName = "HouseLive";
    }

    return collectionName;
};

function responseMetadata(request, response, item, next) {
    var requestTop = 0;
    var requestSkip = 0;
    var perPage = 0;
    var totalResults = 0;

    if (item != null) {
        if (item.Results) {
            totalResults = item.InlineCount;
        } else {
            totalResults = 1;
        }
    }

    if (!request.query.$top) {
        requestTop = 0;
    } else {
        requestTop = request.query.$top;
    }

    if (!request.query.$skip) {
        requestSkip = 0;
    } else {
        requestSkip = request.query.$skip;
    }

    if (requestTop >= config.response.recordLimit && totalResults > requestTop || requestTop == 0 && totalResults != 1) {
        perPage = config.response.recordLimit;
    } else if (requestTop < totalResults && totalResults != 1) {
        perPage = requestTop;
    } else {
        perPage = totalResults;
    }

    var currentPage = 0;

    if (requestSkip == 0) {
        currentPage = 0;
    } else {
        currentPage = Math.ceil(requestSkip / perPage);
    }

    if (totalResults > 0) {
        var numberOfPages = Math.ceil(totalResults / perPage);
    }

    var metadata = {
        page: currentPage,
        count: totalResults,
        per_page: perPage,
        number_pages: numberOfPages,
        time: new Date().toISOString(),
        target: 'US.Clerk.LCS.API.v2.00'
    };

    response.setHeader("Access-Control-Allow-Origin", config.response.accessControl);
    var acceptType = request.get('accept');

    try {
        if (acceptType.includes(',')) {
            var acceptTypes = acceptType.split(',');

            acceptType = acceptTypes[0];
        }

        switch (acceptType) {
            case 'text/html':
                response.setHeader("Content-Type", "text/html");

                if (!item.Results) {
                    response.status(200).send({
                        results: [item],
                        pagination: metadata
                    });
                } else {
                    response.status(200).send({
                        results: item.Results,
                        pagination: metadata
                    });
                }

                break;
            case 'application/json':
                response.setHeader("Content-Type", "application/json");

                if (!item.Results) {
                    response.status(200).json({
                        results: [item],
                        pagination: metadata
                    });
                } else {
                    response.status(200).json({
                        results: item.Results,
                        pagination: metadata
                    });
                }

                break;
            case 'application/xml':
                response.setHeader("Content-Type", "application/xml");

                if (!item.Results) {
                    response.status(200).send(js2xml.parse("Clerk.LCS.API.LegislativeData", {
                        results: [item],
                        pagination: metadata
                    }));
                } else {
                    response.status(200).send(js2xml.parse("Clerk.LCS.API.LegislativeData", {
                        results: item.Results,
                        pagination: metadata
                    }));
                }

                break;
            default:
                //utilsHttp.notSupported(request, response); // Default to JSON per req by AM.
                response.setHeader("Content-Type", "application/json");

                if (!item.Results) {
                    response.status(200).json({
                        results: [item],
                        pagination: metadata
                    });
                } else {
                    response.status(200).json({
                        results: item.Results,
                        pagination: metadata
                    });
                }
        }
    } catch (err) {
        utils.cLog.error("[ERROR] trying to response with metadata");
        next(err);
    }
};

function getExcludesField(collectionName){
    if (config.excludes && Array.isArray(config.excludes[collectionName.toUpperCase()])) {
        const select = {};
        config.excludes[collectionName.toUpperCase()].forEach(fld => {
            select[fld] = 0;
        });
        return select;
    }
    return {};
}
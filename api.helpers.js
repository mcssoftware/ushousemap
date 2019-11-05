const config = require('../config/config.js');
const nr = require('newrelic');
// const iconv = require('iconv-lite');
const utils = require('./utils.helpers')();
const request = require('request');
const addResults = utils.addResults;
const cLog = utils.cLog;
// const writeToLog = utils.writeToLog;
const key = config.api.key ? `&subscription-key=${config.api.key}` : '';
const successCode = 200;
const requestSettings = {
  rejectUnauthorized: false,
  agentOptions: {
    keepAlive: true
  },

  json: true
};

let base = config.api.base.replace(/\/$/, "");

const helpers = () => {
  // Builds the call to our API - adds in the base, key, and whatever else we might need
  const buildApiQuery = (route, query, cb, requestDate) => {
    const topOnly = query.indexOf('$top') > -1 ? true : false;
    const date = requestDate || null;

    // const 
    const url = buildUrl(route, query);

    callApiRenewRelic({
      url,
      topOnly,
      date
    }, cb);
  };

  // Calls the given (external) URL (without handling any sort of pagination)
  const buildExternalQuery = (opts, cb) => {
    // The Majority Leader JSON has unusual encoding (non UTF-8), so we need to have options to allow for decoding it
    if (!(opts instanceof Object)) opts = {
      url: opts
    }; // If the options are not in object form, assume just the URL was passed in
    if (opts.decode) opts.encoding = null; // Have Request ignore its own encoding in favor of ours

    cLog.verbose(opts.url);

    request(opts, (error, response, body) => {
      if (!error && response.statusCode === successCode) {
        // if (!!opts.decode) body = iconv.decode(body, opts.decode);
        if (response.headers['content-type'] === 'application/json') {
          return cb(JSON.parse(body));
        }

        return cb(body);
      } else {
        cLog.error(error);
        return cb([]); // TODO: Better handling of errors
      }
    });
  };

  const callApiRenewRelic = (opts, cb) => {
    nr.startBackgroundTransaction((opts.url || '').split('?')[0], 'Calling House API', function transactionHandler() {
      var transaction = nr.getTransaction()
      callApi(opts, (result) => {
        transaction.end()
        cb(result);
      });
    });
  }

  // Makes call to the API, handling pagination if necessary
  const callApi = (opts, cb) => {
    const url = opts.url || ''; // URL to call
    const skip = opts.skip || 0; // Skip value for pagination
    const results = opts.results || []; // Results array (to combine paginated data)
    const date = opts.date || null; // Date value (for adding the date to Legislative Action bills)
    let skipQuery = skip ? `$skip=${skip}` : ''; // Skip OData query
    let requestOpts = requestSettings; // Config options for the Request module

    requestOpts.url = addQueryToUrl(url, skipQuery + key);
    cLog.verbose("Calling api service: " + requestOpts.url);

    // Sends request to the url
    request(requestOpts, (error, response, body) => {
      cLog.verbose(requestOpts.url);
      if (!error && (response.statusCode === successCode) && body) {
        const data = body; // JSON representation of the data
        const pagination = data.pagination || {};
        const perPage = pagination.per_page || data.results.length; // How many entries per page are there
        const totalItems = pagination.count || data.results.length;; // How many total entries in the results
        const totalPages = pagination.number_pages || 1; // Total amount of result pages
        let pagesAdded = 1; // For incrementing the skip count and controlling how many times the API is called
        let pagesRetrieved = 1; // For keeping track of when requests actually finish

        // Handle data - add to our result array (this strips it of the pagination metadata)
        addResults(data.results, results);

        // Send combined results to client if there is only one page (or if we only want the first one), else continue to call the api (if paginated)
        if ((totalPages === 1) || (totalItems === 0) || (opts.topOnly)) {
          return cb(results); // Send to client
        } else {
          // Makes all the calls at roughly the same time, so just FYI the returned order won't be exact
          while (pagesAdded < totalPages) { // We can assume the 1st page was added
            skipQuery = `&$skip=${(pagesAdded * perPage)}`;
            makePaginatedRequest(url + skipQuery + key);
            pagesAdded++;
          }
        }

        // TODO: Fix
        // eslint-disable-next-line no-inner-declarations
        function makePaginatedRequest(url, currentAttempt) {
          let attempts = currentAttempt || 0;

          requestOpts.url = url;
          request(requestOpts, (error, response, body) => {
            if (!error && (response.statusCode === successCode) && body) {
              if (body.results) addResults(body.results, results);
              pagesRetrieved++;

              if (pagesRetrieved === totalPages) {
                cLog.verbose(`Done retrieving data for ${url}`);
                return cb(results);
              }
            } else {
              attempts++;
              cLog.error(`PAGINATION ERROR: ${JSON.stringify(error)} ${JSON.stringify(body || '')}; Errortimeout: ${config.api.errorTimeout} Maxattempt: ${config.api.maxAttempts} Retry #${attempts} at ${url}`);
              cLog.warn(`Retry #${attempts}`);

              if (attempts <= config.api.maxAttempts) {
                setTimeout(() => {
                  makePaginatedRequest(url, attempts);
                }, config.api.errorTimeout);
              } else {
                cLog.error(`Hit max attempt limit calling: ${url}`);

                // TODO: Send better error and check for it in service
                return cb([]);
              }
            }
          });
        }
      } else {
        // TODO: Specify retry on ECONNRESET
        const attempts = opts.attempts ? opts.attempts + 1 : 1;

        opts.attempts = attempts;
        cLog.error(`ERROR: ${JSON.stringify(error)} ${JSON.stringify(body || '')}; Url: ${requestOpts.url}`);
        cLog.warn(`Retry attempt #${attempts}`);

        if (attempts <= config.maxAttempts) {
          setTimeout(() => {
            callApi(opts, cb);
          }, config.errorTimeout);
        } else {
          cLog.error(`Hit max attempt limit calling: ${requestOpts.url}`);

          // TODO: Send better error and check for it in service
          return cb([]);
        }

        // cb([]); // TODO: Pass back error message instead to be handled on client
      }
    });
  };

  const buildUrl = (route, query) => {
    // const 
    if (config.api.isAzure) {
      return addQueryToUrl(base.replace(/{collection}/i, route), query);
    } else {
      return addQueryToUrl(base + "/" + route, query);
    }
  };

  const addQueryToUrl = (url, query) => {
    if (query.trim().length === 0) {
      return url;
    }
    if (url.indexOf('?') > -1) {
      if (url[url.length - 1] === '?') {
        if (query[0] === '&' && query.length > 1) {
          return url + query.substring(1);
        } else {
          return url + query;
        }
      } else {
        if (query[0] === '&') {
          return url + query;
        } else {
          return url + '&' + query;
        }
      }
    } else {
      if (query.indexOf('?') > -1) {
        return url + query;
      } else {
        return url + '?' + query;
      }
    }
  };

  return {
    buildApiQuery: buildApiQuery,
    buildExternalQuery: buildExternalQuery
  };
};

module.exports = helpers;
// Local imports
const config = require('../config/config.js');
const apiUtils = require('../helpers/api.helpers')();
const utils = require('../helpers/utils.helpers')();
const timeUtils = require('../helpers/time.helpers')();
const getTranscriptData = require('../services/transcriptRetriever');
const transcriptParser = require('../services/transcriptParser')();

const buildApiQuery = apiUtils.buildApiQuery;
const routes = config.api.routes;

// for caching session days
const sessionDays = {};
sessionDays[(new Date()).getFullYear()] = {};
sessionDays[(new Date()).getFullYear() - 1] = {};

// TODO: Add ability to only get counts
const apiController = (() => {
  // Latest Summary
  const getTopFloorSummary = (req, res) => {
    const query = '?$orderby=_id desc&$top=1';

    buildApiQuery(routes.floorSummary, query, (data) => {
      res.send((data && data.length) ? data[0] : {});
    });
  };

  // Floor Summary
  const getFloorSummary = (req, res) => {
    const dateIsValid = timeUtils.validateDate(req.params.date);
    const sanitizedDate = timeUtils.sanitizeDate(req.params.date || '');

    // Default to last entry if no date
    const query = dateIsValid ?
      `?$filter=_id eq '${sanitizedDate}'` :
      '?$orderby=_id desc&$top=1';

    buildApiQuery(routes.floorSummary, query, (data) => {
      return res.send((data && data.length) ? data[0] : {});
    });
  };

  // Days in Session
  const getSessionDays = (req, res) => {
    try {
      const year = req.params.year || (new Date()).getFullYear();
      const query = `?$filter=startswith(_id,${year})&$select=startDate`;
      let cached = false;
      var ms_per_minute = 1000 * 60;
      var cachingTime = 60 * ms_per_minute;
      let datasent = false;
      if (sessionDays.hasOwnProperty(year)) {
        if (sessionDays[year].hasOwnProperty("lastUpdated") && sessionDays[year].hasOwnProperty("sessionDays")) {
          if ((Date.now() - sessionDays[year]["lastUpdated"]) < cachingTime) {
            datasent = cached = true;
            res.send(sessionDays[year]["sessionDays"]);
          }
        }
      }

      if (!cached) {
        buildApiQuery(routes.floorSummary, query, (data) => {
          if (sessionDays.hasOwnProperty(year)) {
            sessionDays[year] = {
              lastUpdated: Date.now(),
              sessionDays: data
            };
          }
          if (!datasent) {
            return res.send(data);
          }
        });
      }
    } catch (err) {
      console.error(err) // will log the error with the error stack
    }
    // Default to current year if no date specified

  };

  // Bill Details (single)
  const getBill = (req, res) => {
    const query = `?$filter=_id eq '${req.params.id}'`;

    buildApiQuery(routes.bills, query, (data) => {
      return res.send(data);
    });
  };

  // Bill Details (date range)
  // TODO: Action Source System eq 'House floor actions' as well? (ex. 115HR366 shows up on floor, but has no action type eq 'Floor')
  const getBills = (req, res) => {
    const select = '&$select=bill/billNumber,bill/billType,bill/title,bill/titles/detail/titles,bill/committees/detail/billCommittees,bill/sponsors,bill/introducedDate,bill/latestAction';
    let query = null;

    if (req.query.start) {
      query = req.query.end ?
        `?$filter=bill/actions/actions/detail/actions/any(actions: actions/type eq 'Floor' and actions/actionDate ge '${req.query.start}' and actions/actionDate le '${req.query.end}')` :
        // If no end, limit to that day
        `?$filter=bill/actions/actions/detail/actions/any(actions: actions/type eq 'Floor' and startswith(actions/actionDate,'${req.query.start.split('T')[0]}'))`;
    } else {
      // Set query to return nothing or something limited (ex. last vote)
      query = '?$top=1';
    }

    buildApiQuery(routes.bills, `${query}${select}`, (data) => {
      return res.send(data);
    });
  };

  // Bills with the specified actions for the date range (ex. Introduced, Reported, etc.)
  // TODO: Get last week from start date
  const getBillActions = (req, res) => {
    const select = '&$select=bill/billNumber,bill/billType,bill/title,bill/titles/detail/titles,bill/actions/detail/actions,bill/committees/detail/billCommittees,bill/sponsors,bill/introducedDate,bill/latestAction';
    const filterBase = '?$filter=bill/actions/actions/detail/actions/any';
    const actionCodeFilter = req.query.actionCode ? `actions/actionCode eq '${req.query.actionCode}'` : '';
    const start = req.query.start;
    const end = req.query.end;
    let query = null;

    if (start) {
      query = end ?
        // Need to be sure it includes everything from the last day
        `${filterBase}(actions: actions/actionDate ge '${start}' and actions/actionDate le '${end}T00:00:00.000' and ${actionCodeFilter})` :
        // If no end, limit to that day
        `${filterBase}(actions: startswith(actions/actionDate,'${start.split('T')[0]}') and ${actionCodeFilter})`;
    } else {
      // Set query to return nothing or something limited (ex. last vote)
      query = '?$top=1';
    }

    buildApiQuery(routes.bills, `${query}${select}`, (data) => {
      return res.send(data);
    });
  };

  // Single Vote Details
  const getVote = (req, res) => {
    const select = '&$select=superEvent/superEvent/congressNum,name,rollCallNum,legisNum,voteQuestion,amendmentNum,amendmentAuthor,voteType,result,description,voteTotals,candidateTotals';
    const query = `?$filter=_id eq '${req.params.id}'${select}`;

    buildApiQuery(routes.votes, query, (data) => {
      return res.send(data);
    });
  };

  // Vote Details (date range)
  const getVotes = (req, res) => {
    const select = '&$select=superEvent/superEvent/congressNum,name,rollCallNum,legisNum,voteQuestion,amendmentNum,amendmentAuthor,voteType,result,description,voteTotals,candidateTotals';
    let query = null;

    if (req.query.start) {
      query = req.query.end ?
        `?$filter=startDate gt '${req.query.start}' and startDate lt '${req.query.end}'` :
        // If no end, limit to that day
        `?$filter=startswith(startDate, '${req.query.start.split('T')[0]}')`;
    } else {
      // Set query to return nothing or something limited (ex. last vote)
      query = '?$orderby=startDate desc&$top=1';
    }

    buildApiQuery(routes.votes, `${query}${select}`, (data) => {
      res.send(data ? data : []);
    });
  };

  // Committee Meetings
  const getMeetings = (req, res) => {
    const query = `?$filter=startswith(startDate, '${req.params.date}') eq true&$orderby=startDate`;

    buildApiQuery(routes.committeeMeetings, query, (data) => {
      return res.send({
        startDate: req.params.date,
        results: data
      });
    });
  };

  // Bills this Weeks (aka Floor Schedules)
  // TODO: Support both date formats of "YYYY-MM-DD" and "YYYYMMDD"?
  const getBillsThisWeek = (req, res) => {
    // Note: Date should be the start of the week (sanitized)
    const beginningOfWeek = timeUtils.getLastMonday(req.params.date);
    let query = null;

    if (beginningOfWeek) {
      query = `?$filter=_id eq '${beginningOfWeek.replace(/-/g, '')}'`;

      buildApiQuery(routes.billsthisweek, query, (data) => {
        return res.send(data);
      });
    } else {
      // TODO: Send error instead
      return res.send([]);
    }
  };

  // Returns links to video and captions for the date
  const getBroadcastEvents = (req, res) => {
    const date = req.params.date;
    const query = `/${date}?`;

    buildApiQuery(routes.broadcastEvents, query, (data) => {
      return res.send(data);
    });
  };

  // Gets the transcript file for the date
  // NOTE: Might not be in use?
  const getTranscriptFile = (req, res) => {
    const date = utils.sanitize(req.params.date);

    getTranscriptData(date, (data) => {
      return res.send(data);
    });
  };

  // Returns a parsed transcript file
  const getTranscript = (req, res) => {
    const date = utils.sanitize(req.params.date);

    getTranscriptData(date, (data) => {
      return res.send(transcriptParser.parseTranscriptData(data));
    });
  };

  return {
    getTopFloorSummary,
    getFloorSummary,
    getSessionDays,
    getBill,
    getBills,
    getBillActions,
    getVote,
    getVotes,
    getBillsThisWeek,
    getMeetings,
    // ==================
    getTranscript, // TODO?
    getBroadcastEvents,
    getTranscriptFile
  };
})();

module.exports = apiController;
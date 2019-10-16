const fs = require('fs');

const config = require('../configs/config');
const loggingLevel = config.loggingLevel;
const writeLevel = config.writeLevel;


module.exports = {
    // fileNameFriendly - Used in file names such as logs, etc., strips out colons.
    // dateOnly -- Strips out time and displays only date.
    getDateTime: function (fileNameFriendly, dateOnly) {
        fileNameFriendly = fileNameFriendly || false;
        dateOnly = dateOnly || false;

        var date = new Date();

        var hour = date.getHours();
        hour = (hour < 10 ? "0" : "") + hour;

        var min = date.getMinutes();
        min = (min < 10 ? "0" : "") + min;

        var sec = date.getSeconds();
        sec = (sec < 10 ? "0" : "") + sec;

        var year = date.getFullYear();

        var month = date.getMonth() + 1;
        month = (month < 10 ? "0" : "") + month;

        var day = date.getDate();
        day = (day < 10 ? "0" : "") + day;

        if (fileNameFriendly) {
            if (dateOnly) {
                return year + "_" + month + "_" + day;
            } else {
                return year + "_" + month + "_" + day + "_" + hour + "_" + min + "_" + sec;
            }
        } else {
            if (dateOnly) {
                return year + "-" + month + "-" + day;
            } else {
                return year + "-" + month + "-" + day + "T" + hour + ":" + min + ":" + sec;
            }
        }
    },

    removeParameter: function (url, parameter) {
        var urlParts = url.split('?');
        if (urlParts.length >= 2) {
            var prefix = encodeURIComponent(parameter) + '=';
            var parts = urlParts[1].split(/[&;]/g);

            for (var i = parts.length; i-- > 0;) {
                if (parts[i].lastIndexOf(prefix, 0) !== -1) {
                    parts.splice(i, 1);
                }
            }

            url = urlParts[0] + (parts.length > 0 ? '?' + parts.join('&') : "");

            return url;
        } else {
            return url;
        }
    },

    isString: function (str) {
        return typeof str === "string" && str.trim().length > 0;
    },

    stringify: function (obj, replacer, spaces, cycleReplacer) {
        return JSON.stringify(obj, serializer(replacer, cycleReplacer), spaces)
    },

    serializer: function (replacer, cycleReplacer) {
        var stack = [],
            keys = []

        if (cycleReplacer == null) cycleReplacer = function (key, value) {
            if (stack[0] === value) return "[Circular ~]"
            return "[Circular ~." + keys.slice(0, stack.indexOf(value)).join(".") + "]"
        }

        return function (key, value) {
            if (stack.length > 0) {
                var thisPos = stack.indexOf(this);
                thisPos ? stack.splice(thisPos + 1) : stack.push(this);
                thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key);
                if (stack.indexOf(value)) value = cycleReplacer.call(this, key, value)
            } else stack.push(value)

            return replacer == null ? value : replacer.call(this, key, value)
        }
    },

    writeToLog: function (text, url) {
        const dateString = new Date()
            .toISOString()
            .split('T')[0];

        // Write to basic error log
        fs.appendFile(`logs/${dateString}.txt`, text + '\r\n', (err) => {
            if (err) {
                utils.cLog(err);
            }
        });
    },

    // To toggle on / off logging
    cLog: function (message, override) {
        let newmsg = this.getDateTime().toString() + ' ' + message;
        switch (loggingLevel) {
            case 2:
                console.log(newmsg);
                break;
            case 1:
                if (override) console.log(newmsg);
                break;
            case 0:
                break;
            default:
                // Default is no logging
        }

        switch (writeLevel) {
            case 2:
                this.writeToLog(newmsg);
                break;
            case 1:
                if (override) this.writeToLog(newmsg);
                break;
            case 0:
                break;
            default:
                // Default is no log writing
        }
    }

};
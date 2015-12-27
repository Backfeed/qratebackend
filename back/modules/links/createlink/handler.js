'use strict';

/**
 * Serverless Module: Lambda Handler
 * - Your lambda functions should be a thin wrapper around your own separate
 * modules, to keep your code testable, reusable and AWS independent
 * - 'serverless-helpers-js' module is required for Serverless ENV var support.  Hopefully, AWS will add ENV support to Lambda soon :)
 */

// Require Serverless ENV vars
var ServerlessHelpers = require('serverless-helpers-js').loadEnv();


var helpers = require('../lib/helpers.js');

var log = helpers.log('CREATE FUNCTION');

log('Loading');

module.exports.handler = function(event, context) {

  log("event", event);
  log("context", context);

  var url = event.url;
  var submitterId = event.submitterId;
  var tag = event.tag;

  helpers.create(submitterId, url, tag, function(err, data) {
    if (err) {
      log('error in link submission', err);
      context.fail('error in link submission' + err);
    } else {
      log('link submitted sucessfully!', data);
      context.succeed({
        data: data
      });
    }
  });

}
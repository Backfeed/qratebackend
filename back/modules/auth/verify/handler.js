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

var log = helpers.log('VERIFY USER FUNCTION');

log('Loading');

module.exports.handler = function(event, context) {
  var email = event.email;
  var verifyToken = event.verify;

  helpers.getUserForVerification(email, function(err, verified, correctToken) {
    if (err) {
      context.fail('Error in getUser: ' + err);
      log('Error in getUser: ',err);
    } else if (verified) {
      log('User already verified: ' + email);
      context.succeed({
        verified: true
      });
    } else if (verifyToken == correctToken) {
      // User verified
      helpers.updateUserAfterVerification(email, function(err, data) {
        if (err) {
          log('Error in updateUser: ', err);
          context.fail('Error in updateUser: ' + err);
        } else {
          log('User verified: ', email);
          context.succeed({
            verified: true
          });
        }
      });
    } else {
      // Wrong token, not verified
      log('User not verified: wrong token', email);
      context.succeed({
        verified: false
      });
    }
  });
}

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

var log = helpers.log('SIGNUP FUNCTION');

log('Loading');

module.exports.handler = function(event, context) {

  var email = event.email;
  var clearPassword = event.password;

  helpers.computeHashSignup(clearPassword, function(err, salt, hash) {
    if (err) {
      log('Error in hash: ', err);
      context.fail('Error in hash: ' + err);
    } else {
      helpers.storeUser(email, hash, salt, function(err, token) {
        if (err) {
          if (err.code == 'ConditionalCheckFailedException') {
            log("user exists", err);
            context.succeed({
              created: false
            });
          } else {
            log('Error in storeUser: ', err);
            context.fail('Error in storeUser: ' + err);
          }
        } else {
          helpers.sendVerificationEmail(email, token, function(err, data) {
            if (err) {
              log('Error in sendVerificationEmail: ' + err)
              context.fail('Error in sendVerificationEmail: ' + err);
            } else {
              context.succeed({
                created: true
              });
            }
          });
        }
      });
    }
  });
}

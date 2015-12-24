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
var log = helpers.log('LOGIN FUNCTION');

log('Loading function');

module.exports.handler = function(event, context) {
  
  var email = event.email;
  var clearPassword = event.password;

  log("email", email, "password", clearPassword);

  helpers.getUser(email, function(err, correctHash, salt, verified, reputation, tokens, uuid) {

    log("getUser", "correctHash", correctHash, "salt", salt, "verified", verified, "reputation", reputation, "tokens", tokens);

    if (err) {
      context.fail('Error in getUser: ' + err);
    } else {
      if (correctHash == null) {
        // User not found
        log('User not found: ', email);
        context.succeed({
          login: false
        });
      } 

      else if (!verified) {
        // User not verified
        log('User not verified: ', email);
        context.succeed({
          login: false
        });
      } 

      else {
        helpers.computeHashLogin(clearPassword, salt, function(err, salt, hash) {
          if (err) {
            log('Error in hash: ', err);
            context.fail('Error in hash: ' + err);
          } else {
            log('correctHash: ', correctHash, ' hash: ', hash);
            if (hash == correctHash) {
              // Login ok
              log('User logged in: ' + email);
              context.succeed({
                email: email,
                uuid: uuid,
                correctHash: correctHash,
                salt: salt,
                verified: verified,
                reputation: reputation,
                tokens: tokens
              });
              helpers.getCognitoToken(email, function(err, identityId, token) {
                if (err) {
                  log('Error in getCognitoToken: ', err);
                  context.fail('Error in getCognitoToken: ' + err);
                } else {
                  log('got cognito id! check local storage!');
                  context.succeed({
                    login: true,
                    identityId: identityId,
                    token: token
                  });
                }
              });
            } else {
              // Login failed
              log('User login failed: ', email);
              context.succeed({
                login: false
              });
            }
          }
        });
      }
    }
  });
}

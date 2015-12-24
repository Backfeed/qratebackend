module.exports = {

  computeHashSignup: computeHashSignup,
  computeHashLogin: computeHashLogin,
  randomEmail: randomEmail,
  storeUser: storeUser,
  getUser: getUser,
  sendVerificationEmail: sendVerificationEmail,
  getUserForVerification: getUserForVerification,
  updateUserAfterVerification: updateUserAfterVerification,
  getCognitoToken: getCognitoToken,
  log: log

}

var _ = require('underscore');
var crypto = require('crypto');
var uuid = require('node-uuid');
var AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
var cognitoidentity = new AWS.CognitoIdentity();
var dynamodb = new AWS.DynamoDB();
var ses = new AWS.SES();

var hLog = log('HELPERS');

function computeHashSignup(password, salt, fn) {
  // Bytesize
  var len = 128;
  var iterations = 4096;

  if (3 == arguments.length) {
    crypto.pbkdf2(password, salt, iterations, len, fn);
  } else {
    fn = salt;
    crypto.randomBytes(len, function(err, salt) {
      if (err) return fn(err);
      salt = salt.toString('base64');
      crypto.pbkdf2(password, salt, iterations, len, function(err, derivedKey) {
        if (err) return fn(err);
        fn(null, salt, derivedKey.toString('base64'));
      });
    });
  }
}

function computeHashLogin(password, salt, fn) {
  // Bytesize
  var len = 128;
  var iterations = 4096;

  if (3 == arguments.length) {
    crypto.pbkdf2(password, salt, iterations, len, function(err, derivedKey) {
      if (err) return fn(err);
      else fn(null, salt, derivedKey.toString('base64'));
    });
  } else {
    fn = salt;
    crypto.randomBytes(len, function(err, salt) {
      if (err) return fn(err);
      salt = salt.toString('base64');
      computeHashLogin(password, salt, fn);
    });
  }
}

function randomEmail() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text + "@gmail.com";
}

function storeUser(email, password, salt, fn) {
  // Bytesize
  var len = 128;
  crypto.randomBytes(len, function(err, token) {
    if (err) return fn(err);
    token = token.toString('hex');
    dynamodb.putItem({
      TableName: 'qrateUsers',
      Item: {
        uuid: {
          S: uuid.v4()
        },
        email: {
          S: email
        },
        passwordHash: {
          S: password
        },
        passwordSalt: {
          S: salt
        },
        verified: {
          BOOL: false
        },
        verifyToken: {
          S: token
        },
        reputation: {
          N: "150"
        },
        tokens: {
          N: "150"
        }

      },
      ConditionExpression: 'attribute_not_exists (email)'
    }, function(err, data) {
      if (err) return fn(err);
      else fn(null, token);
    });
  });
}


function getUser(email, fn) {
  hLog("getUser", "email", email, "fn", fn);
  dynamodb.getItem({
    TableName: 'qrateUsers',
    Key: {
      email: {
        S: email
      }
    }
  }, function(err, data) {
    if (err) {
      hLog("CB: getUser: err", err);
      return fn(err);
    }
    else {
      hLog("CB: getUser: data", data);
      if ('Item' in data) {
        var hash = data.Item.passwordHash.S;
        var salt = data.Item.passwordSalt.S;
        var verified = data.Item.verified.BOOL;
        var reputation = data.Item.reputation.N;
        var tokens = data.Item.tokens.N;
        var uuid = data.Item.uuid.S;
        fn(null, hash, salt, verified, reputation, tokens, uuid);
      } else {
        fn(null, null); // User not found
      }
    }
  });
}


function log(prefix) {

  return function() {
    console.log('***************** ' + 'AUTH: ' prefix + ' *******************');
    _.each(arguments, function(msg, i) { console.log(msg); });
    console.log('***************** /' + 'AUTH: ' prefix + ' *******************');
    console.log('\n');
  };

}

function sendVerificationEmail(email, token, fn) {
  var subject = 'Verification Email for qrate';
  var verificationLink = 'https://s3.amazonaws.com/backfeed.users/verify.html?email=' + encodeURIComponent(email) + '&verify=' + token;
  ses.sendEmail({
    Source: 'support@backfeed.cc',
    Destination: {
      ToAddresses: [
        email
      ]
    },
    Message: {
      Subject: {
        Data: subject
      },
      Body: {
        Html: {
          Data: '<html><head>'
          + '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />'
          + '<title>' + subject + '</title>'
          + '</head><body>'
          + 'Please <a href="' + verificationLink + '">click here to verify your email address</a> or copy & paste the following link in a browser:'
          + '<br><br>'
          + '<a href="' + verificationLink + '">' + verificationLink + '</a>'
          + '</body></html>'
        }
      }
    }
  }, fn);
}


function getUserForVerification(email, fn) {
  dynamodb.getItem({
    TableName: 'qrateUsers',
    Key: {
      email: {
        S: email
      }
    }
  }, function(err, data) {
    if (err) return fn(err);
    else {
      if ('Item' in data) {
        var verified = data.Item.verified.BOOL;
        var verifyToken = null;
        if (!verified) {
          verifyToken = data.Item.verifyToken.S;
        }
        fn(null, verified, verifyToken);
      } else {
        fn(null, null); // User not found
      }
    }
  });
}

function updateUserAfterVerification(email, fn) {
  dynamodb.updateItem({
      TableName: 'qrateUsers',
      Key: {
        email: {
          S: email
        }
      },
      AttributeUpdates: {
        verified: {
          Action: 'PUT',
          Value: {
            BOOL: true
          }
        },
        verifyToken: {
          Action: 'DELETE'
        }
      }
    },
    fn);
}

function getCognitoToken(email, fn) {
  log("getCognitoToken", "email", email, "fn", fn);
  var param = {
    IdentityPoolId: 'us-east-1:b10673e0-1654-4519-9938-2d624de0532a',
    Logins: {} // To have provider name in a variable
  };
  param.Logins['login.backfeed.qrate'] = email;
  cognitoidentity.getOpenIdTokenForDeveloperIdentity(param,
    function(err, data) {
      log("cb; getCognitoToken", "err", err, "data", data);
      if (err) return fn(err); // an error occurred
      else fn(null, data.IdentityId, data.Token); // successful response
    });
}
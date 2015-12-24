module.exports = {

  create: create,
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

function create() {
  dynamodb.PutItem({
    TableName: 'qrateLinks',
    Item: {
      id: { S: { uuid.u4() } },
      submitterId: { S: { submitterId } },
      url: { S: { url } },
      tag: { S : { tag} }
    }
  }, function(err, data) {
    if (err) return fn(err);
    else fn(null, data);
  });
}

function log(prefix) {

  return function() {
    console.log('***************** ' + 'LINKS' + prefix + ' *******************');
    _.each(arguments, function(msg, i) { console.log(msg); });
    console.log('***************** /' + 'LINKS' + prefix + ' *******************');
    console.log('\n');
  };

}
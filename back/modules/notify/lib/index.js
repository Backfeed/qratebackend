const https = require('https');
const url = require('url');
const slack_url = 'https://hooks.slack.com/services/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';
const slack_req_opts = url.parse(slack_url);
slack_req_opts.method = 'POST';
slack_req_opts.headers = {'Content-Type': 'application/json'};

module.exports.respond = function(event, cb) {

  var response = {
    message: "Nu"
  };
  var req = https.request(slack_req_opts, function (res) {
    if (res.statusCode === 200) {
      //context.succeed('posted to slack');
      response.message = 'posted to slack';
      return cb(null, response);
    } else {
      //context.fail('status code: ' + res.statusCode);
      response.message = 'status code: ' + res.statusCode;
      return cb(null, response);
    }
  });

  req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
    response.message = 'problem with request: ' + e.message;
    return cb(null, response);
    //context.fail(e.message);
  });

  req.write(JSON.stringify(event)); // for testing: , channel: '@jankei'
  req.end();
};

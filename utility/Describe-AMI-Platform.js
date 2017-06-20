//Get information regarding AMIs Platform (Linux or Windows)
var aws = require('aws-sdk');
var ec2 = new aws.EC2();
exports.handler = (event, context, callback) => {
  var AmiId = event.AmiId;
  var params = {
    DryRun: false,
    Filters: [{},
      /* more items */
    ],
    ImageIds: [
      AmiId,
    ],
  };
  ec2.describeImages(params, function(err, data) {
    if (err) { // an error occurred
      console.log(err, err.stack);
      callback(err);
    } else {
      var json = JSON.parse(JSON.stringify(data));
      console.log(json);
      var AmiPlatform = json.Images[0].Platform;

      if (AmiPlatform === undefined) {
        AmiPlatform = 'Linux';
      } else {
        AmiPlatform = 'Windows';
      }
      console.log('Platform is ' + AmiPlatform);
      callback(null, AmiPlatform);
    }
  });
};
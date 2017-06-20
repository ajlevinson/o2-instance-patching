//Get information regarding AMIs
var aws = require('aws-sdk');
var jp = require('jsonpath');
var ec2 = new aws.EC2();
exports.handler = (event, context, callback) => {
  var params = {
    DryRun: false,
    Filters: [{
        Name: 'owner-id',
        Values: [
          '023718874208',
          /* more items */
        ]
      },
      /* more items */
    ],
    ImageIds: [
      'ami-4a6a495c',
      /* more items */
    ],
  };
  ec2.describeImages(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else {
      //console.log(data); // successful response
      var json = JSON.parse(JSON.stringify(data));
      console.log(json);
      //console.log('Tags are ' + json.Images[0].Tags[0].Name);
      var UpdateAmi = jp.query(json, '$.Images[?(@.Key=="o2:update:ami")].Value');
      console.log("o2:update:ami value is: " + UpdateAmi);



    }
  });
};
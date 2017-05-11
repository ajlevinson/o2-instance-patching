"use strict";
var aws = require('aws-sdk');

var stepfunctions = new aws.StepFunctions();

exports.handler = (event, context, callback) => {

	var paramsWindows = {
		stateMachineArn: 'arn:aws:states:us-east-1:023718874208:stateMachine:test-params',
		/* required */
		input: '{"instanceId": "i-0307abc6bd16a5731"}'
	};
	stepfunctions.startExecution(paramsWindows, function(err, data) {
		if (err) console.log(err, err.stack); // an error occurred
		else console.log(data); // successful response
	});


	var paramsLinux = {
		stateMachineArn: 'arn:aws:states:us-east-1:023718874208:stateMachine:test-params',
		/* required */
		input: '{"instanceId": "i-0d7646bcd2491d58f"}'
	};
	stepfunctions.startExecution(paramsLinux, function(err, data) {
		if (err) console.log(err, err.stack); // an error occurred
		else console.log(data); // successful response
	});
};
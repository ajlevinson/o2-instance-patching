"use strict";
var aws = require('aws-sdk');
var s3 = new aws.S3();
var ssm = new aws.SSM();
var ec2 = new aws.EC2();

var rebootInstance = function(instanceId, callback) {

	var commandsReboot = [];
	var commandReboot = 'Restart-Computer -Force';
	commandsReboot.push(commandReboot);
	var paramsReboot = {
		DocumentName: 'AWS-RunPowerShellScript',
		InstanceIds: [instanceId],
		Comment: 'Reboot command',
		//OutputS3BucketName: bucket,
		//OutputS3KeyPrefix: fileName,
		Parameters: {
			commands: commandsReboot
		},
		TimeoutSeconds: 60
	};

	console.log("About to send reboot command to InstanceID: " + instanceId);
	ssm.sendCommand(paramsReboot, function(err, data) {
		if (err) callback(commandsReboot + ', Error, ' + err.code + "\n");
		else {
			callback(null, "Sending reboot command to " + instanceId + ', ' + commandsReboot + ', ' + data.Command.CommandId + ', ' + data.Command.Status);
			console.log("Sending reboot command to " + instanceId + ', ' + commandsReboot + ', ' + data.Command.CommandId + ', ' + data.Command.Status + "\n");
		}
	});
};


exports.update = function(event, context, callback) {
	console.log("Starting Reboot-Windows. instanceId= " + event.instanceID);
	console.log("Starting Reboot-Windows. IncludeKbs= " + event.kB);
	console.log("Starting Reboot-Windows. IsReboot= " + event.isReboot);
	var resultFile = '';
	if (event.isReboot == 'true') {
		rebootInstance(event.instanceID, callback, function(result) {

			setTimeout(function() {
				console.log(resultFile);
				var activeParams = {
					Bucket: event.bucket,
					Key: 'result-' + event.fileName,
					Body: new Buffer(resultFile)
				};

				s3.putObject(activeParams, function(err, data) {
					if (err) {
						console.log(err, err.stack);
					} else {
						console.log(data);
					}
				});
			}, 10000);
		});
	}
};
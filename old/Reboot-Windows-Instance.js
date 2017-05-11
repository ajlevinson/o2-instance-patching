"use strict";
var aws = require('aws-sdk');
var s3 = new aws.S3();
var ssm = new aws.SSM();
var readline = require('readline');
var ec2 = new aws.EC2();

var rebootInstance = function(instanceId, bucket, fileName, callback) {

	console.log("Started 'rebootInstance' function");
	console.log("instanceId = " + instanceId);
	console.log("bucket =" + bucket);
	console.log("fileName = " + fileName);
	var commandsReboot = [];
	var commandReboot = 'Restart-Computer -Force';
	commandsReboot.push(commandReboot);
	var paramsReboot = {
		DocumentName: 'AWS-RunPowerShellScript',
		InstanceIds: [instanceId],
		Comment: 'Reboot command',
		OutputS3BucketName: bucket,
		OutputS3KeyPrefix: fileName,
		Parameters: {
			commands: commandsReboot
		},
		TimeoutSeconds: 60
	};

	console.log("About to send reboot command to InstanceID: " + instanceId);
	ssm.sendCommand(paramsReboot, function(err, data) {
		if (err) callback(commandsReboot + ', Error, ' + err.code + "\n");
		else callback("Sending reboot command to " + instanceId + ', ' + commandsReboot + ', ' + data.Command.CommandId + ', ' + data.Command.Status + "\n");
	});
};


var getInstanceIdAndReboot = function(bucket, fileName, ip, callback) {
	var instance = '';
	var params = {
		Filters: [{
			Name: 'private-ip-address',
			Values: [
				ip
			]
		}]
	};

	// get the instance to update based on the private IP
	ec2.describeInstances(params, function(err, data) {
		if (err) console.log(err, err.stack);
		else {
			if (data.Reservations.length > 0) {
				instance = data.Reservations[0].Instances[0];
				rebootInstance(instance.InstanceId, bucket, fileName, callback);
			} else {
				callback('not found');
			}
		}
	});
};

var getUpdateFile = function(bucket, fileName, callback) {
	var updateItems = [];
	var params = {
		Bucket: bucket,
		Key: fileName
	};

	var rl = readline.createInterface({
		input: s3.getObject(params).createReadStream()
	});

	rl.on('line', function(line) {
		updateItems.push(line);
	});
	rl.on('close', function() {
		callback(updateItems);
	});
};

exports.update = function(event, context, callback) {
	var resultFile = '';
	getUpdateFile(event.bucket, event.fileName, function(response) {
		for (var i = 0, len = response.length; i < len; i++) {
			var packages = response[i]; //get the next row in the csv file. for example: test-win,172.31.28.225,true,KB4012218
			console.log("packages = " + packages);
			console.log("response[i].split(',')[1] = " + response[i].split(',')[1]); //the private IP of the instance
			getInstanceIdAndReboot(event.bucket, event.fileName, response[i].split(',')[1], callback, function(result) {
				resultFile = resultFile + result + '\n';
			});
		}
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
};
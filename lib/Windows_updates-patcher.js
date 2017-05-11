"use strict";
var aws = require('aws-sdk');
//var async = require('async');
var s3 = new aws.S3();
//var ec2 = new aws.EC2();
var ssm = new aws.SSM();

var runUpdate = function(instanceId, IncludeKbs, bucket, OutputFolder, callback) {
    var command = '';
    var ExcludeKbs = '';
    var Categories = '';
    var SeverityLevels = '';

    var params = {
        DocumentName: 'AWS-InstallWindowsUpdates',
        Comment: 'OS Patch command',
        InstanceIds: [instanceId],
        OutputS3BucketName: bucket,
        OutputS3KeyPrefix: OutputFolder,
        Parameters: {
            "Action": ["Install"],
            "IncludeKbs": [IncludeKbs]
        },
        TimeoutSeconds: 60
    };
    console.log("Sending InstallWindowsUpdates ssm command with the following InstanceId: " + instanceId + "\n");
    ssm.sendCommand(params, function(err, data) {
        if (err) callback(command + ', Error, ' + err.code + "\n");
        else {
            callback(null);
            console.log("Sending InstallWindowsUpdates " + command + ', ' + data.Command.CommandId + ', ' + data.Command.Status + "\n");
        }
    });
};


exports.update = function(event, kB, callback) {
    console.log("Starting Windows-Update-Patcher. instanceId= " + event.instanceID);
    console.log("Starting Windows-Update-Patcher. IncludeKbs= " + event.kB);
    console.log("Starting Windows-Update-Patcher. bucket= " + event.bucket);
    console.log("Starting Windows-Update-Patcher. OutputFolder= " + event.OutputFolder);
    
    var resultFile = '';
    //event.fileName = "cloudticity-dev-patching-windows";
    //event.bucket = "cloudticity-dev-patching";

    runUpdate(event.instanceID, event.kB, event.bucket, event.OutputFolder, callback, function(response) {
        setTimeout(function() {
            console.log(response);
            var activeParams = {
                Bucket: event.bucket,
                Key: 'result-' + event.OutputFolder,
                Body: new Buffer(response)
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
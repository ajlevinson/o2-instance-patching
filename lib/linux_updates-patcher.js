var aws = require('aws-sdk');
var readline = require('readline');

var s3 = new aws.S3();
var ec2 = new aws.EC2();
var ssm = new aws.SSM();


var runUpdate = function(instanceId, bucket, OutputFolder, IncludedKB, callback) {
    var command = '';


    if (IncludedKB === '') {
        command = 'sudo yum update -y';
    } else if (IncludedKB.toUpperCase() == 'SECURITY') {
        command = 'yum update --security -y';
    } else {
        command = 'yum --security update ' + IncludedKB + ' -y';
    }

    var commands = [];

    commands.push(command);

    var params = {
        DocumentName: 'AWS-RunShellScript',
        InstanceIds: [instanceId],
        Comment: 'OS Patch command',
        OutputS3BucketName: bucket,
        OutputS3KeyPrefix: OutputFolder,
        Parameters: {
            commands: commands
        },
        TimeoutSeconds: 60
    };
    console.log('Sending command to InstanceID: ' + instanceId);
    console.log('Command is: ' + command);
    ssm.sendCommand(params, function(err, data) {
        //console.log('err= ' + err);
        if (err) {
            callback(command + ', Error, ' + err.code);
        } else {
            console.log(command + ', ' + data.Command.CommandId + ', ' + data.Command.Status);
            callback(null);
        }
    });
};

exports.update = function(event, kB, callback) {
    console.log("Starting Linux-Update-Patcher. instanceId= " + event.instanceID);
    console.log("Starting Linux-Update-Patcher. IncludeKbs= " + event.kB);
    console.log("Starting Linux-Update-Patcher. bucket= " + event.bucket);
    console.log("Starting Linux-Update-Patcher. OutputFolder= " + event.OutputFolder);
    var resultFile = '';

    //event.fileName = "cloudticity-dev-patching-Linux";
    //event.bucket = "cloudticity-dev-patching";

    runUpdate(event.instanceID, event.bucket, event.OutputFolder, event.kB, callback, function(response) {

        setTimeout(function() {
            console.log(resultFile);
            var activeParams = {
                Bucket: event.bucket,
                Key: 'result-' + event.OutputFolder,
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
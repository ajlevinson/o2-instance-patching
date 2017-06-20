var aws = require('aws-sdk');
var s3 = new aws.S3();
var ec2 = new aws.EC2();
var ssm = new aws.SSM();


var rebootInstance = function(instanceId,callback) {
    var command = 'shutdown -r +1';

    var commands = [];

    commands.push(command);

    var params = {
        DocumentName: 'AWS-RunShellScript',
        InstanceIds: [instanceId],
        Comment: 'OS reboot command',
        //OutputS3BucketName: bucket,
        //OutputS3KeyPrefix: fileName,
        Parameters: {
            commands: commands
        },
        TimeoutSeconds: 60
    };
    ssm.sendCommand(params, function(err, data) {
        //console.log('err= ' + err);
        if (err) {
            callback(command + ', Error, ' + err.code);
        } else {
            console.log(command + ', ' + data.Command.CommandId + ', ' + data.Command.Status);
            console.log("Sending reboot command to " + instanceId + ', ' + command + ', ' + data.Command.CommandId + ', ' + data.Command.Status + "\n");
            callback(null,"Sending reboot command to " + instanceId + ', ' + command + ', ' + data.Command.CommandId + ', ' + data.Command.Status);
        }
    });
};

exports.update = function(event, kB, callback) {
    console.log("Starting Reboot-Linux. instanceId= " + event.instanceID);
    console.log("Starting Reboot-Linux. IncludeKbs= " + event.kB);
    console.log("Starting Reboot-Linux. IsReboot= " + event.isReboot);
    var resultFile = '';
    if (event.isReboot == 'true') {
        rebootInstance(event.instanceID, callback, function(response) {
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
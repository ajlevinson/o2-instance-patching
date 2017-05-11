"use strict";
var aws = require('aws-sdk');
var readline = require('readline');
var async = require('async');


var s3 = new aws.S3();
var ec2 = new aws.EC2();
var ssm = new aws.SSM();

var getInstanceAndDoUpdate = function(bucket, fileName, ip, packages, isDryRun, isReboot, callback) {
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
                runUpdate(instance.InstanceId, packages, isDryRun, isReboot, bucket, fileName, function(update) {
                    callback(ip + ', ' + update);
                });
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

var buildCommand = function(packages, isDryRun, callback) {
    var items = packages.split(',');
    var command = '';

    if (isDryRun) {

        for (var i = 3, len = items.length; i < len; i++) {
            command = command + ' ' + items[i];
        }
        callback(command);
    } else {

        for (var i1 = 3, len1 = items.length; i1 < len1; i1++) {
            command = command + ' ' + items[i1];
        }
        callback(command);
    }
};

var runUpdate = function(instanceId, packages, isDryRun, isReboot, bucket, fileName, callback) {
    var command = '';
    var host = packages.split(',')[0];

    buildCommand(packages, isDryRun, function(comResponse) {

        var IncludeKbs = packages.split(',')[3];
        console.log("KB to install = " + packages.split(',')[3] + "\n");
        var ExcludeKbs = packages.split(',')[4];
        console.log("ExcludeKbs = " + ExcludeKbs + "\n");
        var Categories = packages.split(',')[5];
        console.log("Categories = " + packages.split(',')[5] + "\n");
        var SeverityLevels = packages.split(',')[6];
        console.log("SeverityLevels = " + packages.split(',')[6] + "\n");

        var params = {
            DocumentName: 'AWS-InstallWindowsUpdates',
            Comment: 'OS Patch command',
            InstanceIds: [instanceId],
            OutputS3BucketName: bucket,
            OutputS3KeyPrefix: fileName,
            Parameters: {
                "Action": ["Install"],
                "IncludeKbs": [IncludeKbs],
                "ExcludeKbs": [ExcludeKbs],
                "Categories": [Categories],
                "SeverityLevels": [SeverityLevels]
            },
            TimeoutSeconds: 60
        };
        console.log("Sending InstallWindowsUpdates ssm command with the following InstanceId: " + instanceId + "\n");
        ssm.sendCommand(params, function(err, data) {
            if (err) callback(host + ', ' + command + ', Error, ' + err.code + "\n");
            else callback("Sending InstallWindowsUpdates " + host + ', ' + command + ', ' + data.Command.CommandId + ', ' + data.Command.Status + "\n");

            if (isReboot === true) {
                if (packages.split(',')[2] == 'true') {

                    console.log("Going to 'rebootInstance' function");
                    setTimeout(rebootInstance(instanceId, packages, bucket, fileName, callback, host), 5000);
                }
            }
        });
    });
};


var rebootInstance = function(instanceId, packages, bucket, fileName, callback, host) {

    console.log("Started 'rebootInstance' function");
    var commandsReboot = [];
    var commandReboot = 'Restart-Computer -Force';
    commandsReboot.push(commandReboot);
    var paramsReboot = {
        DocumentName: 'AWS-RunPowerShellScript',
        InstanceIds: [instanceId],
        Comment: 'OS Patch command',
        OutputS3BucketName: bucket,
        OutputS3KeyPrefix: fileName,
        Parameters: {
            commands: commandsReboot
        },
        TimeoutSeconds: 60
    };

    ssm.sendCommand(paramsReboot, function(err, data) {
        if (err) callback(host + ', ' + commandsReboot + ', Error, ' + err.code + "\n");
        else callback("Sending reboot command to " + host + ', ' + commandsReboot + ', ' + data.Command.CommandId + ', ' + data.Command.Status + "\n");
    });
};;

var getInstancePlatform = function(instanceID, callback) {
    let ssm = new AWS.SSM();
    let params = {
        InstanceInformationFilterList: [{
            key: "InstanceIds",
            valueSet: [
                instanceID
            ]
        }]
    };
    ssm.describeInstanceInformation(params, function(err, instanceData) {
        if (err) {
            callback(err)
        } else {
            let instanceInformation = instanceData.InstanceInformationList[0]
            if (instanceInformation) {
                callback(null, instanceInformation.PlatformType);
            } else {
                callback('Unknown instance platform');
            }

        }
    });
}


exports.update = function(event, context, callback) {
    var resultFile = '';
    getUpdateFile(event.bucket, event.fileName, function(response) {
        for (var i = 0, len = response.length; i < len; i++) {
            var packages = response[i]; //get the next row in the csv file. for example: test-win,172.31.28.225,true,KB4012218
            console.log("packages = " + packages);
            console.log("response[i].split(',')[1] = " + response[i].split(',')[1]); //the private IP of the instance
            getInstanceAndDoUpdate(event.bucket, event.fileName, response[i].split(',')[1], packages, event.isDryRun, event.isReboot, function(result) {
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
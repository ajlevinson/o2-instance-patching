"use strict";
var aws = require('aws-sdk');
var ec2 = new aws.EC2();
var ssm = new aws.SSM();
var stepfunctions = new aws.StepFunctions();
var s3 = new aws.S3();
var readline = require('readline');

var getInstanceIdAndCallStepFunction = function(bucket, fileName, ip, IncludeKbs, IsReboot, StateMachineFunctionARN,OutputFolder,callback) {
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
                updateInstances(instance.InstanceId, bucket, fileName, IncludeKbs, IsReboot, StateMachineFunctionARN, OutputFolder,callback);
            } else {
                callback('not found');
            }
        }
    });
};

var updateInstances = function(instanceId, bucket, fileName, IncludeKbs, IsReboot, StateMachineFunctionARN, OutputFolder,callback) {
    console.log("Starting Patcher-Main-Loop.updateInstances. - instanceId is: " + instanceId);
    console.log("Starting Patcher-Main-Loop.updateInstances. - IncludeKbs: " + IncludeKbs);
    console.log("Starting Patcher-Main-Loop.updateInstances. - IsReboot: " + IsReboot);
    console.log("Starting Patcher-Main-Loop.updateInstances. - StateMachineFunctionARN: " + StateMachineFunctionARN);

    var event = [];

    var paramsWindows = {
        stateMachineArn: StateMachineFunctionARN,

        //stateMachineArn: 'arn:aws:states:us-east-1:023718874208:stateMachine:Cloudticity-Oxygen-Patch-OS-V-1.4',
        //stateMachineArn: 'arn:aws:states:us-east-1:023718874208:stateMachine:Cloudticity-Oxygen-Restart-Instance-V-1.1',
        /* required */
        //input: '{"instanceId": "i-0307abc6bd16a5731"}'
        input: '{"instanceId":' + '"' + instanceId + '"' + "," +
            '"IncludeKbs":' + '"' + IncludeKbs + '"' + "," +
            '"isReboot":' + '"' + IsReboot + '"' + "," +
            '"OutputFolder":' + '"' + OutputFolder + '"' + "," +
            '"bucket":' + '"' + bucket
            + '"}'
    };
    console.log("paramsWindows.input = " + paramsWindows.input);

    stepfunctions.startExecution(paramsWindows, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else console.log(data); // successful response
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
            var IncludeKbs = packages.split(',')[3];
            var instancePrivateIP = packages.split(',')[1];
            var isReboot = packages.split(',')[2];
            console.log("packages = " + packages);
            console.log("IncludeKbs = " + IncludeKbs);
            console.log("instancePrivateIP = " + instancePrivateIP);
            console.log("isReboot = " + isReboot);
            console.log("event.fileName = " + event.fileName);
            console.log("event.bucket = " + event.bucket);
            console.log("event.OutputFolder = " + event.OutputFolder);
            

            //console.log("response[i].split(',')[1] = " + response[i].split(',')[1]); //the private IP of the instance
            //console.log("response[i].split(',')[2] = " + response[i].split(',')[2]); //reboot
            getInstanceIdAndCallStepFunction(event.bucket, event.fileName, response[i].split(',')[1], IncludeKbs, isReboot, event.StateMachineFunctionARN, event.OutputFolder,callback, function(result) {
                resultFile = resultFile + result + '\n';
            });
        }

        console.log("Done with all step functions");
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
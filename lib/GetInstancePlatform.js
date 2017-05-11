var aws = require('aws-sdk');
var getInstancePlatform = function(instanceID, event, IncludeKbs, isReboot, bucket, OutputFolder, callback) {
    var ssm = new aws.SSM();
    var params = {
        InstanceInformationFilterList: [{
            key: "InstanceIds",
            valueSet: [
                instanceID
            ]
        }]
    };
    ssm.describeInstanceInformation(params, function(err, instanceData) {
        if (err) {
            callback(err);
        } else {
            let instanceInformation = instanceData.InstanceInformationList[0];
            if (instanceInformation) {
                console.log('Running GetInstancePlatform. PlatformType = ' + instanceInformation.PlatformType);
                //callback(null, JSON.stringify({ PlatformType: instanceInformation.PlatformType }));
                callback(null, {
                    PlatformType: instanceInformation.PlatformType,
                    kB: IncludeKbs,
                    instanceID: instanceID,
                    isReboot: isReboot,
                    bucket: bucket,
                    OutputFolder: OutputFolder
                }, event);
            } else {
                callback('Unknown instance platform');
            }

        }
    });
};

exports.update = (event, context, callback) => {
    var instanceId = event.instanceId;
    var IncludeKbs = event.IncludeKbs;
    var instanceType = '';
    var isReboot = event.isReboot;
    var bucket = event.bucket;
    var fileName = event.fileName;
    var OutputFolder = event.OutputFolder;
    getInstancePlatform(instanceId, event, IncludeKbs, isReboot, bucket, OutputFolder, callback);
};
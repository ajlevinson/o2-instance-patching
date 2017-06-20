var aws = require('aws-sdk');
var GetDoumentStatus = function(InstanceId, event, IncludeKbs, isReboot, bucket, OutputFolder, CommandId, callback) {
    var ssm = new aws.SSM();
    var params = {
        CommandId: CommandId,
        InstanceId: InstanceId
    };

    ssm.getCommandInvocation(params, function(err, instanceData) {
            if (err) {
                callback(err);
            } else {

                console.log('Running getCommandInvocation. InstanceId = ' + InstanceId);
                console.log('Command Status is = ' + instanceData.Status);
                callback(null, {
                    kB: IncludeKbs,
                    InstanceId: InstanceId,
                    isReboot: isReboot,
                    bucket: bucket,
                    OutputFolder: OutputFolder
                }, event);
            }
        }
    );
};

exports.update = (event, context, callback) => {
    var CommandId = event.CommandId;
    var InstanceId = event.InstanceId;
    var instanceType = '';
    var isReboot = event.isReboot;
    var bucket = event.bucket;
    var fileName = event.fileName;
    var OutputFolder = event.OutputFolder;
    var IncludeKbs = event.IncludeKbs;
    GetDoumentStatus(InstanceId, event, IncludeKbs, isReboot, bucket, OutputFolder, CommandId, callback);
};
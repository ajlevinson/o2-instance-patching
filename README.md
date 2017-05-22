# Release 1.1

* Added the ability to define specific security packages to be updated.(Linux)
* Added the ability to specify that only security related packages will be updated (Linux)

============================================================================

# MVP Release

The requirements for the MVP release are [here](http://teamwork.cloudticity.com/#tasks/9745437).

A flowchart of the overall process is [here](https://www.lucidchart.com/invitations/accept/e7f67da3-52ca-4dec-8168-dab91af5f7c7).

The product is included in the "Cloudticity MSP Portfolio" Service Catalog portfolio:
* [Cloudticity Oxygen Restart Instances](https://console.aws.amazon.com/servicecatalog/home?region=us-east-1#/product/details?productId=prod-xua42lr5bvivs)
* [Cloudticity Oxygen OS Patching](https://console.aws.amazon.com/servicecatalog/home?region=us-east-1#/product/details?productId=prod-qzmqvdkm5bpq2)


## Manifest File Structure[
The [manifest file](https://github.com/Cloudticity/o2-patcher/blob/master/events/ManifestFileSample.csv) is a CSV file. Each row represents a single instance and a single KB.
This means that if we need to patch an instance with three KBs, that instance will have three rows in the file.
Each row contains four elements; elements are separated by commas:
* Instance's name as it appears on the aws console.
* Instance's private IP
* Boolean flag to indicate restart yes or no.
* KB number to apply to Windows instances.
## High-Level Process Flow
1. The process is initiated by submitting a [json input file](https://github.com/Cloudticity/o2-patcher/blob/master/events/TestFileSample.json) to the Patcher's main loop [Lambda function](https://github.com/Cloudticity/o2-patcher/blob/master/lib/Patcher-Main-Loop.js).
The various elements in the input file are as follows:
* bucket: The s3 bucket that contains the [manifest file](https://github.com/Cloudticity/o2-patcher/blob/master/events/ManifestFileSample.csv).
* fileName: The name of the manifest file.
* isDryRun: irrelevant for this release.
* isReboot: irrelevant for this release.
* StateMachineFunctionARN: The step function ARN to execute. For the MVP release, the options are [OS Patching](https://github.com/Cloudticity/o2-patcher/blob/master/StepFunctions/Cloudticity-Oxygen-OS-Patch-SF.json) or [Reboot Instances](https://github.com/Cloudticity/o2-patcher/blob/master/StepFunctions/Cloudticity-Oxygen-Restart-Instance-SF.json)
* OutputFolder: The folder in the S3 bucket where the output of the process will be created.
2. The main loop Lambda evaluates the "StateMachineFunctionARN" input parameter and based on its value, executes the [OS patching](https://github.com/Cloudticity/o2-patcher/blob/master/StepFunctions/Cloudticity-Oxygen-OS-Patch-SF.json) or the [Restart](https://github.com/Cloudticity/o2-patcher/blob/master/StepFunctions/Cloudticity-Oxygen-Restart-Instance-SF.json) step functions.
3. The Step Function's first process is to call the [GetInstancePlatform](https://github.com/Cloudticity/o2-patcher/blob/master/lib/GetInstancePlatform.js) Lambda to determine whether the instance is Windows or Linux.
4. Based on the instance type (Windows or Linux) and the process to execute (Patch or Restart), the process will perform one of four options:
* [Patch Windows instance](https://github.com/Cloudticity/o2-patcher/blob/master/lib/Windows_updates-patcher.js) with the KB specified in the manifest file.
* [Patch Linux instance](https://github.com/Cloudticity/o2-patcher/blob/master/lib/linux_updates-patcher.js).
* [Restart Windows instance](https://github.com/Cloudticity/o2-patcher/blob/master/lib/Reboot-Windows-Instance-patcher.js)
* [Restart Linux instance](https://github.com/Cloudticity/o2-patcher/blob/master/lib/Reboot-Linux-Instance-patcher.js).

## To-Do
Requirements list can be found [here](https://github.com/Cloudticity/o2-patcher/wiki)

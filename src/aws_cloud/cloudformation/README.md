### Steps to deploy the CloudFormation templates

----------

* Setup AWS CLI as per your operating system from the steps mentioned [here](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html).
* Setup the AWS credentials: `$ aws configure` so that the aws cli can connect to your account
* Create cloudformation stacks using the aws cli
  * `$ aws cloudformation create-stack --stack-name <stackname> --capabilities CAPABILITY_AUTO_EXPAND --capabilities CAPABILITY_IAM --template-body file://<templatefilename>`
* To delete the stack and it's resources:
  * ` $ aws cloudformation delete-stack --stack-name <stackname>` 
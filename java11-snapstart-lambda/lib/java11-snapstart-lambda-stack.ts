import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deployment from 'aws-cdk-lib/aws-s3-deployment';

export class Java11SnapstartLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // artifact bucket and ZIP deployment
    const artifactBucket = new s3.Bucket(this, 'ArtifactBucket');
    const artifactDeployment = new s3Deployment.BucketDeployment(this, 'DeployFiles', {
      sources: [s3Deployment.Source.asset('./artifacts')],
      destinationBucket: artifactBucket,
    });

    // IAM role
    const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });
    lambdaExecutionRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));
    
    // base Lambda functions
    const baseWithSnapStart = new lambda.CfnFunction(this, 'BaseWithSnapStart', {
      code: {
        s3Bucket: artifactDeployment.deployedBucket.bucketName,
        s3Key: 'corretto-test.zip'
      },
      functionName: 'baseWithSnapStart',
      handler: 'example.Hello::handleRequest',
      role: lambdaExecutionRole.roleArn,
      runtime: 'java11',
      snapStart: { applyOn: 'PublishedVersions' }
    });
    const baseWithoutSnapStart = new lambda.CfnFunction(this, 'BaseWithoutSnapStart', {
      code: {
        s3Bucket: artifactDeployment.deployedBucket.bucketName,
        s3Key: 'corretto-test.zip'
      },
      functionName: 'baseWithoutSnapStart',
      handler: 'example.Hello::handleRequest',
      role: lambdaExecutionRole.roleArn,
      runtime: 'java11'
    });
  }
}

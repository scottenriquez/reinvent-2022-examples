import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

export class Ec2InstanceWithDatadogStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // networking
    const vpc = new ec2.Vpc(this, 'VPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      natGateways: 0
    });
    const selection = vpc.selectSubnets({
      // using public subnets as to not incur NAT Gateway charges
      subnetType: ec2.SubnetType.PUBLIC
    });
    const dataDogInstanceSecurityGroup = new ec2.SecurityGroup(this, 'datadog-instance-sg', {
      vpc: vpc,
      allowAllOutbound: true,
    });
    // IP range for EC2 Instance Connect
    dataDogInstanceSecurityGroup.addIngressRule(ec2.Peer.ipv4('18.206.107.24/29'), ec2.Port.tcp(22), 'allow SSH access for EC2 Instance Connect');

    // IAM
    const dataDogInstanceRole = new iam.Role(this, 'datadog-instance-role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('EC2InstanceConnect'),
      ],
    });

    // EC2 instance
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      'sudo yum install ec2-instance-connect',
      // set these environment variables with your DataDog API key and site
      `DD_API_KEY=${process.env.DD_API_KEY} DD_SITE="${process.env.DD_SITE}" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script_agent7.sh)"`,
    );
    const ec2Instance = new ec2.Instance(this, 'ec2-instance', {
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      role: dataDogInstanceRole,
      securityGroup: dataDogInstanceSecurityGroup,
      // note: this will incur a charge
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MEDIUM,
      ),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      userData: userData
    });
  }
}

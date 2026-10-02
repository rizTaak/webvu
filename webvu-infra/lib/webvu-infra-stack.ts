import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export class WebvuInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC — 2 AZs, public subnets only, no NAT gateway to keep costs minimal
    const vpc = new ec2.Vpc(this, 'WebvuVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: 'Public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
      ],
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'WebvuCluster', { vpc });

    // No ALB — traffic arrives via a Cloudflare Tunnel. The cloudflared sidecar dials out to
    // Cloudflare, so the task needs no inbound ports. Hostname/path routing to the containers
    // (localhost:3000 for /api/*, localhost:3001 for the rest) is configured on the tunnel
    // in the Cloudflare dashboard.
    // Token is a SecureString created out-of-band (CloudFormation can't create SecureStrings):
    //   aws ssm put-parameter --name /webvu/cloudflared-tunnel-token --type SecureString --value <token>
    const tunnelToken = ssm.StringParameter.fromSecureStringParameterAttributes(this, 'TunnelToken', {
      parameterName: '/webvu/cloudflared-tunnel-token',
    });

    // --- ECR Repositories (managed by WebvuEcrStack, referenced by name) ---
    const apiRepo = ecr.Repository.fromRepositoryName(this, 'ApiRepo', 'webvu-api');
    const uiRepo = ecr.Repository.fromRepositoryName(this, 'UiRepo', 'webvu-ui');

    const apiImageTag = 'v26.8.1.0';
    const uiImageTag = 'v26.8.1.0';
    const desiredCount = 1;

    // --- App Task (API + UI combined into one task) ---
    const appTaskDef = new ecs.FargateTaskDefinition(this, 'AppTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    appTaskDef.addContainer('ApiContainer', {
      image: ecs.ContainerImage.fromEcrRepository(apiRepo, apiImageTag),
      portMappings: [{ containerPort: 3000 }],
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'webvu-api',
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
    });

    appTaskDef.addContainer('UiContainer', {
      image: ecs.ContainerImage.fromEcrRepository(uiRepo, uiImageTag),
      portMappings: [{ containerPort: 3001 }],
      // Next.js standalone binds to $HOSTNAME, which ECS sets to the task hostname; cloudflared
      // reaches the UI via localhost, so listen on all interfaces.
      environment: { HOSTNAME: '0.0.0.0' },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'webvu-ui',
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
    });

    appTaskDef.addContainer('CloudflaredContainer', {
      image: ecs.ContainerImage.fromRegistry('cloudflare/cloudflared:2026.9.3'),
      command: ['tunnel', '--no-autoupdate', 'run'],
      secrets: { TUNNEL_TOKEN: ecs.Secret.fromSsmParameter(tunnelToken) },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'webvu-cloudflared',
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
    });

    const appService = new ecs.FargateService(this, 'AppService', {
      cluster,
      taskDefinition: appTaskDef,
      desiredCount,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      assignPublicIp: true, // outbound only (ECR pulls, cloudflared → Cloudflare); no inbound rules
      circuitBreaker: { rollback: true },
      // Start the replacement task before stopping the old one so the tunnel always has a connector.
      minHealthyPercent: 100,
    });
    // Removing the ALB left the service pointing at the deleted target groups (CloudFormation omits
    // the property rather than clearing it), which fails every later update. Clear it explicitly.
    (appService.node.defaultChild as ecs.CfnService).addPropertyOverride('LoadBalancers', []);

    // Outputs
    new cdk.CfnOutput(this, 'ApiEcrUri', {
      description: 'ECR repository URI for webvu-api',
      value: apiRepo.repositoryUri,
    });

    new cdk.CfnOutput(this, 'UiEcrUri', {
      description: 'ECR repository URI for webvu-ui',
      value: uiRepo.repositoryUri,
    });
  }
}

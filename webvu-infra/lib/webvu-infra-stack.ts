import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class WebvuInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC — 2 AZs, single NAT gateway to keep costs minimal
    const vpc = new ec2.Vpc(this, 'WebvuVpc', {
      maxAzs: 2,
      natGateways: 1,
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'WebvuCluster', { vpc });

    // Application Load Balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, 'WebvuAlb', {
      vpc,
      internetFacing: true,
    });

    // --- ECR Repositories (images pushed by CI) ---
    const apiRepo = new ecr.Repository(this, 'ApiRepo', {
      repositoryName: 'webvu-api',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [{ maxImageCount: 10 }],
    });

    const uiRepo = new ecr.Repository(this, 'UiRepo', {
      repositoryName: 'webvu-ui',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [{ maxImageCount: 10 }],
    });

    // Image tags passed in via cdk deploy --context apiImageTag=v1.0.0
    const apiImageTag = this.node.tryGetContext('apiImageTag') ?? 'latest';
    const uiImageTag = this.node.tryGetContext('uiImageTag') ?? 'latest';

    // --- API Service ---
    const apiTaskDef = new ecs.FargateTaskDefinition(this, 'ApiTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    apiTaskDef.addContainer('ApiContainer', {
      image: ecs.ContainerImage.fromEcrRepository(apiRepo, apiImageTag),
      portMappings: [{ containerPort: 3000 }],
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'webvu-api',
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
    });

    const apiService = new ecs.FargateService(this, 'ApiService', {
      cluster,
      taskDefinition: apiTaskDef,
      desiredCount: 1,
    });

    // --- UI Service ---
    const uiTaskDef = new ecs.FargateTaskDefinition(this, 'UiTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    uiTaskDef.addContainer('UiContainer', {
      image: ecs.ContainerImage.fromEcrRepository(uiRepo, uiImageTag),
      portMappings: [{ containerPort: 3001 }],
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'webvu-ui',
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
      environment: {
        NEXT_PUBLIC_API_URL: `http://${alb.loadBalancerDnsName}`,
      },
    });

    const uiService = new ecs.FargateService(this, 'UiService', {
      cluster,
      taskDefinition: uiTaskDef,
      desiredCount: 1,
    });

    // --- ALB Listener ---
    // Default action: route to UI
    const uiTargetGroup = new elbv2.ApplicationTargetGroup(this, 'UiTG', {
      vpc,
      port: 3001,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [uiService],
      healthCheck: { path: '/' },
    });

    const listener = alb.addListener('HttpListener', {
      port: 80,
      defaultTargetGroups: [uiTargetGroup],
    });

    // Path rule: /api/* → API service
    const apiTargetGroup = new elbv2.ApplicationTargetGroup(this, 'ApiTG', {
      vpc,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [apiService],
      healthCheck: { path: '/api/hello' },
    });

    listener.addAction('ApiAction', {
      priority: 10,
      conditions: [elbv2.ListenerCondition.pathPatterns(['/api/*'])],
      action: elbv2.ListenerAction.forward([apiTargetGroup]),
    });

    // Outputs
    new cdk.CfnOutput(this, 'AlbDnsName', {
      description: 'Application Load Balancer DNS name',
      value: alb.loadBalancerDnsName,
    });

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

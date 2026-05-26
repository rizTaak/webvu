import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

export interface WebvuInfraStackProps extends cdk.StackProps {
  certificateArn: string;
}

export class WebvuInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WebvuInfraStackProps) {
    super(scope, id, props);

    // VPC — 2 AZs, single NAT gateway to keep costs minimal
    const vpc = new ec2.Vpc(this, 'WebvuVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: 'Public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
      ],
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'WebvuCluster', { vpc });

    // ALB security group — only Cloudflare IPs allowed in (https://www.cloudflare.com/ips/)
    // This prevents anyone from bypassing Cloudflare and hitting the ALB directly.
    const cloudflareIpv4 = [
      '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
      '104.16.0.0/13', '104.24.0.0/14', '108.162.192.0/18',
      '131.0.72.0/22', '141.101.64.0/18', '162.158.0.0/15',
      '172.64.0.0/13', '173.245.48.0/20', '188.114.96.0/20',
      '190.93.240.0/20', '197.234.240.0/22', '198.41.128.0/17',
    ];
    const cloudflareIpv6 = [
      '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32',
      '2405:b500::/32', '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32',
    ];

    const albSg = new ec2.SecurityGroup(this, 'AlbSg', {
      vpc,
      description: 'ALB: allow inbound on port 443 from Cloudflare IPs only',
      allowAllOutbound: true,
    });
    for (const cidr of cloudflareIpv4) {
      albSg.addIngressRule(ec2.Peer.ipv4(cidr), ec2.Port.tcp(443), 'Cloudflare IPv4');
    }
    for (const cidr of cloudflareIpv6) {
      albSg.addIngressRule(ec2.Peer.ipv6(cidr), ec2.Port.tcp(443), 'Cloudflare IPv6');
    }

    // Certificate is managed in WebvuEcrStack (permanent) so it survives teardowns.
    const certificate = acm.Certificate.fromCertificateArn(this, 'WebvuCert', props.certificateArn);

    // Application Load Balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, 'WebvuAlb', {
      vpc,
      internetFacing: true,
      securityGroup: albSg,
    });

    // --- ECR Repositories (managed by WebvuEcrStack, referenced by name) ---
    const apiRepo = ecr.Repository.fromRepositoryName(this, 'ApiRepo', 'webvu-api');
    const uiRepo = ecr.Repository.fromRepositoryName(this, 'UiRepo', 'webvu-ui');

    const apiImageTag = 'v26.5.2.2';
    const uiImageTag = 'v26.5.2.2';
    const desiredCount = 1;

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
      desiredCount,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      assignPublicIp: true,
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
        NEXT_PUBLIC_API_URL: 'https://webvu.io',
      },
    });

    const uiService = new ecs.FargateService(this, 'UiService', {
      cluster,
      taskDefinition: uiTaskDef,
      desiredCount,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      assignPublicIp: true,
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

    const listener = alb.addListener('HttpsListener', {
      port: 443,
      certificates: [certificate],
      defaultTargetGroups: [uiTargetGroup],
      open: false, // Don't auto-add 0.0.0.0/0 — Cloudflare SG handles ingress
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

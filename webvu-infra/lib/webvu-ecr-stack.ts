import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

// Permanent stack — never destroyed, survives compute teardowns.
// ECR images are preserved across WebvuInfraStack destroy/redeploy cycles.
export class WebvuEcrStack extends cdk.Stack {
  // Exposed so WebvuInfraStack can create an alias record in this zone without needing tokens.
  public readonly originZone: route53.PublicHostedZone;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new ecr.Repository(this, 'ApiRepo', {
      repositoryName: 'webvu-api',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [{ maxImageCount: 5 }],
    });

    new ecr.Repository(this, 'UiRepo', {
      repositoryName: 'webvu-ui',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [{ maxImageCount: 5 }],
    });

    // Permanent Route 53 zone for origin.webvui.io.
    // WebvuInfraStack creates an ALB alias record here on every deploy — the Cloudflare
    // NS delegation below never changes, so no tokens or secrets are ever needed.
    this.originZone = new route53.PublicHostedZone(this, 'OriginZone', {
      zoneName: 'origin.webvui.io',
    });
    this.originZone.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

    // Output the nameservers — you only read these once to set up Cloudflare NS records.
    new cdk.CfnOutput(this, 'OriginZoneNameservers', {
      description: 'Add as NS records for origin.webvui.io in Cloudflare (one-time setup, never changes)',
      value: cdk.Fn.join(', ', this.originZone.hostedZoneNameServers!),
    });
  }
}


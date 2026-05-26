import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

// Permanent stack — never destroyed, survives compute teardowns.
// Holds ECR repos, images, and the ACM certificate so teardowns never require re-validation.
export class WebvuEcrStack extends cdk.Stack {
  readonly certificateArn: string;

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

    // Certificate lives here so it survives WebvuInfraStack destroy/redeploy cycles.
    // DNS validation: add the CNAME shown in CloudFormation events to Cloudflare (DNS-only).
    const certificate = new acm.Certificate(this, 'WebvuCert', {
      domainName: 'webvu.io',
      subjectAlternativeNames: ['*.webvu.io'],
      validation: acm.CertificateValidation.fromDns(),
    });
    this.certificateArn = certificate.certificateArn;
  }
}


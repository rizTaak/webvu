import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

// Permanent stack — never destroyed, survives compute teardowns.
// ECR images are preserved across WebvuInfraStack destroy/redeploy cycles.
export class WebvuEcrStack extends cdk.Stack {
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
  }
}

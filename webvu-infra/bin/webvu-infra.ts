#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WebvuOnetimeInfraStack } from '../lib/webvu-onetime-infra-stack';
import { WebvuInfraStack } from '../lib/webvu-infra-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
};

// Permanent — never destroy this stack (holds ECR repos, images, and ACM cert)
const ecrStack = new WebvuOnetimeInfraStack(app, 'WebvuOnetimeInfraStack', { env });

// The compute stack no longer imports the cert ARN (TLS is terminated by Cloudflare).
// Keep the export alive until WebvuInfraStack has been redeployed without the import,
// otherwise deploying this stack first fails with "Export ... in use". Safe to remove after.
ecrStack.exportValue(ecrStack.certificateArn);

// Compute — safe to destroy when not in use to save costs
new WebvuInfraStack(app, 'WebvuInfraStack', { env });

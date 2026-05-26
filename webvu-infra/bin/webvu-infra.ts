#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WebvuEcrStack } from '../lib/webvu-ecr-stack';
import { WebvuInfraStack } from '../lib/webvu-infra-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
};

// Permanent — never destroy this stack (holds ECR repos, images, and ACM cert)
const ecrStack = new WebvuEcrStack(app, 'WebvuEcrStack', { env });

// Compute — safe to destroy when not in use to save costs
new WebvuInfraStack(app, 'WebvuInfraStack', { env, certificateArn: ecrStack.certificateArn });

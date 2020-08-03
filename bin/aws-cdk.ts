#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { CdkStack } from "../lib/aws-cdk-stack";
import { CloudFrontStack } from "../lib/cloud-front-stack";

const app = new cdk.App();
new CdkStack(app, "ImageResizeCdk", { env: { region: "ap-northeast-2" } });
new CloudFrontStack(app, "ImageResizeCF", { env: { region: "us-east-1" } });

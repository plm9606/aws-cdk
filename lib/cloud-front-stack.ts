import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as s3 from "@aws-cdk/aws-s3";
import { LambdaDestination } from "@aws-cdk/aws-s3-notifications";
import * as iam from "@aws-cdk/aws-iam";

export class CloudFrontStack extends cdk.Stack {}

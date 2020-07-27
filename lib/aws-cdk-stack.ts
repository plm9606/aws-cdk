import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as s3 from "@aws-cdk/aws-s3";
import { LambdaDestination } from "@aws-cdk/aws-s3-notifications";
import * as iam from "@aws-cdk/aws-iam";
import * as cloudfront from "@aws-cdk/aws-cloudfront";

export class CdkStack extends cdk.Stack {
  private readonly BUCKET_NAME = "aram-image-resize-cdk-bucket";
  private readonly SOURCE_BUCKET = "image-resizing-test-nbbangdev";
  private readonly SOURCE_BUCKET_KEY = "lambda/image-resize.zip";
  private codeBucket: s3.IBucket;
  private imageResizeFunction: lambda.Function;
  private resizedImageBucket: s3.Bucket;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.codeBucket = s3.Bucket.fromBucketName(
      this,
      "FucntionDeployBucket",
      this.SOURCE_BUCKET
    );

    this.createResizeFunction();
    this.createResizedImageBucket();
    this.createCloudFront();
  }
  createResizeFunction() {
    this.imageResizeFunction = new lambda.Function(
      this,
      "ImageResizeCDKFunction",
      {
        runtime: lambda.Runtime.NODEJS_12_X,
        handler: "./.build/src/index.resize",
        code: lambda.S3Code.fromBucket(this.codeBucket, this.SOURCE_BUCKET_KEY), //lambda.Code.fromAsset(path.join(__dirname, "../../.build/code/")),
        environment: {
          BUCKET_NAME: this.BUCKET_NAME,
        },
        memorySize: 1024,
        timeout: cdk.Duration.seconds(6),
      }
    );
  }

  createResizedImageBucket() {
    this.resizedImageBucket = new s3.Bucket(this, this.BUCKET_NAME, {
      bucketName: this.BUCKET_NAME,
    });

    const policy = new iam.PolicyStatement({
      actions: ["s3:GetObject", "s3:PutObject"],
      resources: [this.resizedImageBucket.arnForObjects("*")],
    });

    if (this.imageResizeFunction.role?.roleArn) {
      policy.addArnPrincipal(this.imageResizeFunction.role?.roleArn);
      this.resizedImageBucket.addToResourcePolicy(policy);
    } else {
      console.log(
        `imageResizeFunction doesn't have role. Cannot add Bucket Resource Policy.`
      );
    }

    this.resizedImageBucket.grantReadWrite(this.imageResizeFunction);
    this.resizedImageBucket.addObjectCreatedNotification(
      new LambdaDestination(this.imageResizeFunction),
      { prefix: "images/" }
    );
  }

  createCloudFront() {
    const oai = new cloudfront.OriginAccessIdentity(this, "imageResizeOAI", {
      comment: `Allows CloudFront to reach to the ${this.BUCKET_NAME} bucket!`,
    });
    const cf = new cloudfront.CloudFrontWebDistribution(this, "imageDist", {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: this.resizedImageBucket,
            originPath: "/resize",
            originAccessIdentity: oai,
          },
          behaviors: [
            {
              isDefaultBehavior: true,
              defaultTtl: cdk.Duration.millis(86400 * 15),
            },
          ],
        },
      ],
    });

    console.log(`CloudFormatin Domain Name: ${cf.domainName}`);
  }
}

import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as s3 from "@aws-cdk/aws-s3";
import * as iam from "@aws-cdk/aws-iam";
import * as path from "path";
import * as cloudfront from "@aws-cdk/aws-cloudfront";

export class CloudFrontStack extends cdk.Stack {
  private readonly BUCKET_NAME = "aram-image-resize-cdk-bucket";
  private readonly IMAGE_BUCKET_ARN = "arn:aws:s3:::aram-image-resize-cdk-bucket";
  private resizeLambdaEdge: lambda.Function;
  private resizedImageBucket: s3.IBucket;
  private lambdaEdgeVersion: lambda.IVersion;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.resizedImageBucket = s3.Bucket.fromBucketArn(this, 'ImageBucket', this.IMAGE_BUCKET_ARN)

    this.createResizeLambdaEdge();
    this.createCloudFront();
  }

  createResizeLambdaEdge() {
    const role = new iam.Role(this, "lambdaEdgeRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    role.addToPolicy(new iam.PolicyStatement(
      {
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ["iam:CreateServiceLinkedRole",
          "lambda:GetFunction",
          "lambda:EnableReplication",
          "cloudfront:UpdateDistribution",
          "s3:GetObject",
          "s3:PutObject",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
        ]
      }
    ));

    this.resizeLambdaEdge = new lambda.Function(this, "ImageResizeLambdaEdge", {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: "./.build/src/on-demend-resizing.editOriginRequestKey",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../on-response7.zip")
      ), // lambda.S3Code.fromBucket(this.codeBucket, this.SOURCE_BUCKET_KEY),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      role,
    });

    this.lambdaEdgeVersion = this.resizeLambdaEdge.addVersion(new Date().toISOString());
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
            originPath: "",
            originAccessIdentity: oai,
          },
          behaviors: [
            {
              isDefaultBehavior: true,
              defaultTtl: cdk.Duration.millis(86400 * 15),
              lambdaFunctionAssociations: [
                {
                  eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
                  lambdaFunction: this.lambdaEdgeVersion
                },
              ],
            },
          ],
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
    });
  }
}

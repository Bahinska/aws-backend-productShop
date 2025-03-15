import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as path from 'path';
const sqs = require('aws-cdk-lib/aws-sqs');

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = s3.Bucket.fromBucketName(this, 'ImportBucket', 'import-bucket-margo1');

    const importProductsFile = new lambda.Function(this, 'ImportProductsFileFunction', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      code: lambda.Code.fromAsset(path.join('handlers','importHandler')),
      handler: 'import.handler',
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
    });

    bucket.grantReadWrite(importProductsFile);

    const catalogItemsQueue = sqs.Queue.fromQueueArn(this, 'CatalogItemsQueue', 'arn:aws:sqs:eu-north-1:503561416546:ProjectCdkStack-catalogItemsQueue79451959-DKQ3bljjsBNV');

    const importFileParser = new lambda.Function(this, 'ImportFileParserFunction', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      code: lambda.Code.fromAsset(path.join('handlers', 'importFileParser')),
      handler: 'importFileParser.handler',
      environment: {
        BUCKET_NAME: bucket.bucketName,
        QUEUE_URL: catalogItemsQueue.queueUrl,
      },
      timeout: cdk.Duration.seconds(30)
    });
    
    importFileParser.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'sqs:SendMessage',
        'sqs:GetQueueUrl',
        'sqs:GetQueueAttributes'
      ],
      resources: [catalogItemsQueue.queueArn],
    }));

    bucket.grantReadWrite(importFileParser);

    bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(importFileParser), {
      prefix: 'uploaded/',
    });

    const api = new apigateway.RestApi(this, 'ImportApi', {
      restApiName: 'Import Service',
      description: 'This service serves import requests.',
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: ['GET'],
        allowHeaders: ['*'],
      },
    });

    const importIntegration = new apigateway.LambdaIntegration(importProductsFile);

    api.root.addResource('import').addMethod('GET', importIntegration);

    importProductsFile.addToRolePolicy(new iam.PolicyStatement({
      actions: ['s3:PutObject'],
      resources: [`${bucket.bucketArn}/uploaded/*`],
    }));
  }
}
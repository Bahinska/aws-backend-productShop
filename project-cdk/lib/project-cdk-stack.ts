import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

const PRODUCTS_TABLE_NAME = 'Products_DynamoDB';
const STOCKS_TABLE_NAME = 'Stock_DynamoDB';

const environment = {
  PRODUCTS_TABLE_NAME,
  STOCKS_TABLE_NAME,
};

export class ProjectCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dynamoDBPolicy = new cdk.aws_iam.PolicyStatement({
      effect: cdk.aws_iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:Scan',
        'dynamodb:Query',
        'dynamodb:BatchGetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
      ],
      resources: [
        `arn:aws:dynamodb:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account
        }:table/${PRODUCTS_TABLE_NAME}`,
        `arn:aws:dynamodb:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account
        }:table/${STOCKS_TABLE_NAME}`,
      ],
    });

    const productsListHandler = new lambda.Function(this, 'product-service-dev-getProductsList', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      code: lambda.Code.fromAsset(
        path.join(__dirname, '..', '..', 'product-service', 'handlers')
      ),
      handler: 'getProductsList.handler',
      environment,
      timeout: cdk.Duration.seconds(10),
    });
    productsListHandler.addToRolePolicy(dynamoDBPolicy);

    const productByIdHandler = new lambda.Function(this, 'product-service-dev-getProductById', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      code: lambda.Code.fromAsset(
        path.join(__dirname, '..', '..', 'product-service', 'handlers')
      ),
      handler: 'getProductById.handler',
      environment,
    });
    productByIdHandler.addToRolePolicy(dynamoDBPolicy);

    const createProductHandler = new lambda.Function(this, 'product-service-dev-createProduct', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      code: lambda.Code.fromAsset(
        path.join(__dirname, '..', '..', 'product-service', 'handlers')
      ),
      handler: 'createProduct.handler',
      environment,
    });
    createProductHandler.addToRolePolicy(dynamoDBPolicy);

    const api = new apigateway.RestApi(this, 'dev-product-service', {
      restApiName: 'dev-product-service',
      description: 'This is my API Gateway',
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST'],
        allowHeaders: ['*'],
      },
    });

    const products = api.root.addResource('products');
    products.addMethod(
      'GET',
      new apigateway.LambdaIntegration(productsListHandler)
    );
    
    products.addMethod(
      'POST',
      new apigateway.LambdaIntegration(createProductHandler),
      {}
    );

    const product = products.addResource('{productId}');
    product.addMethod(
      'GET',
      new apigateway.LambdaIntegration(productByIdHandler),
      {
        requestParameters: {
          'method.request.path.id': true,
        },
      }
    );

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
    });

    const createProductTopic = new sns.Topic(this, 'createProductTopic');

    createProductTopic.addSubscription(new snsSubscriptions.EmailSubscription('example@domain.com', {
      filterPolicy: {
        productId: sns.SubscriptionFilter.stringFilter({
          allowlist: ['1', '2', '3'],
        }),
      },
    }));

    createProductTopic.addSubscription(new snsSubscriptions.EmailSubscription('another@example.com', {
      filterPolicy: {
        productId: sns.SubscriptionFilter.stringFilter({
          allowlist: ['4', '5', '6'],
        }),
      },
    }));

    createProductTopic.addSubscription(new snsSubscriptions.EmailSubscription('fallback@example.com'));

    const catalogItemsQueue = new sqs.Queue(this, 'catalogItemsQueue');

    const catalogBatchProcessRole = new Role(this, 'CatalogBatchProcessRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        SQSPolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: [
                'sqs:ReceiveMessage',
                'sqs:DeleteMessage',
                'sqs:GetQueueAttributes',
                'sqs:GetQueueUrl',
              ],
              resources: [catalogItemsQueue.queueArn],
            }),
            new PolicyStatement({
              actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    catalogBatchProcessRole.addToPolicy(new PolicyStatement({
      actions: ['sns:Publish'],
      resources: [createProductTopic.topicArn],
    }));

    catalogBatchProcessRole.addToPolicy(dynamoDBPolicy);
    
    const catalogBatchProcess = new lambda.Function(this, 'catalogBatchProcess', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'product-service', 'handlers')),
      handler: 'catalogBatchProcess.handler',
      role: catalogBatchProcessRole,
      environment: {
        PRODUCTS_TABLE_NAME: PRODUCTS_TABLE_NAME,
        CREATE_PRODUCT_TOPIC_ARN: createProductTopic.topicArn
      },
    });

    catalogItemsQueue.grantConsumeMessages(catalogBatchProcess);

    catalogBatchProcess.addEventSource(new SqsEventSource(catalogItemsQueue, {
      batchSize: 5,
    }));
  }
}

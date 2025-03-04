import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';


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

  }
}

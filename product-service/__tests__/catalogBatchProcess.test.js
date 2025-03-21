const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const uuid = require('uuid');
const handler = require('../handlers/catalogBatchProcess');

const dynamoDBMock = mockClient(DynamoDBClient);
const snsClientMock = mockClient(SNSClient);

jest.mock('uuid', () => ({
    v4: jest.fn(() => '1234-5678-91011'),
}));

const mockContext = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'testFunction',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:aws-region:acct-id:function:testFunction',
    memoryLimitInMB: '128',
    awsRequestId: 'awsRequestId',
    logGroupName: 'logGroupName',
    logStreamName: 'logStreamName',
    getRemainingTimeInMillis: () => 30000,
    done: () => { /* no-op */ },
    fail: () => { /* no-op */ },
    succeed: () => { /* no-op */ },
};

const mockCallback = () => { /* no-op */ };

describe('CatalogBatchProcess', () => {
    beforeEach(() => {
        dynamoDBMock.reset();
        snsClientMock.reset();
        jest.resetAllMocks();
    });

    it('should process records and add to DynamoDB and publish to SNS', async () => {
        process.env.PRODUCTS_TABLE_NAME = 'ProductsTable';
        process.env.CREATE_PRODUCT_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:CreateProductTopic';

        const event = {
            Records: [
                {
                    body: JSON.stringify({
                        title: 'Product 1',
                        price: 10.99,
                        description: 'Description 1',
                    }),
                },
                {
                    body: JSON.stringify({
                        title: 'Product 2',
                        price: 20.99,
                        description: 'Description 2',
                    }),
                },
            ],
        };

        dynamoDBMock.on(PutCommand).resolves({});
        snsClientMock.on(PublishCommand).resolves({});

        const result = await handler.handler(event, mockContext, mockCallback);

        expect(dynamoDBMock).toHaveReceivedCommandTimes(PutCommand, 2);
        expect(snsClientMock).toHaveReceivedCommandTimes(PublishCommand, 2);

        expect(dynamoDBMock).toHaveReceivedCommandWith(PutCommand, {
            TableName: 'ProductsTable',
            Item: {
                id: '1234-5678-91011',
                title: 'Product 1',
                price: 10.99,
                description: 'Description 1',
            },
        });

        expect(dynamoDBMock).toHaveReceivedCommandWith(PutCommand, {
            TableName: 'ProductsTable',
            Item: {
                id: '1234-5678-91011',
                title: 'Product 2',
                price: 20.99,
                description: 'Description 2',
            },
        });

        expect(snsClientMock).toHaveReceivedCommandWith(PublishCommand, {
            TopicArn: 'arn:aws:sns:us-east-1:123456789012:CreateProductTopic',
            Message: JSON.stringify({
                title: 'Product 1',
                price: 10.99,
                description: 'Description 1',
            }),
            MessageAttributes: {
                productId: {
                    DataType: 'String',
                    StringValue: '1234-5678-91011',
                },
            },
        });

        expect(snsClientMock).toHaveReceivedCommandWith(PublishCommand, {
            TopicArn: 'arn:aws:sns:us-east-1:123456789012:CreateProductTopic',
            Message: JSON.stringify({
                title: 'Product 2',
                price: 20.99,
                description: 'Description 2',
            }),
            MessageAttributes: {
                productId: {
                    DataType: 'String',
                    StringValue: '1234-5678-91011',
                },
            },
        });
    });

    it('should handle missing product attributes gracefully', async () => {
        process.env.PRODUCTS_TABLE_NAME = 'ProductsTable';
        process.env.CREATE_PRODUCT_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:CreateProductTopic';

        const event = {
            Records: [
                {
                    body: JSON.stringify({
                        title: 'Product 1',
                        price: null,
                        description: 'Description 1',
                    }),
                },
            ],
        };

        dynamoDBMock.on(PutCommand).resolves({});
        snsClientMock.on(PublishCommand).resolves({});

        const result = await handler.handler(event, mockContext, mockCallback);

        expect(dynamoDBMock).toHaveReceivedCommandTimes(PutCommand, 0);
        expect(snsClientMock).toHaveReceivedCommandTimes(PublishCommand, 0);
    });

    it('should log and continue on DynamoDB put error', async () => {
        process.env.PRODUCTS_TABLE_NAME = 'ProductsTable';
        process.env.CREATE_PRODUCT_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:CreateProductTopic';

        const event = {
            Records: [
                {
                    body: JSON.stringify({
                        title: 'Product 1',
                        price: 10.99,
                        description: 'Description 1',
                    }),
                },
            ],
        };

        dynamoDBMock.on(PutCommand).rejects(new Error('DynamoDB put error'));
        snsClientMock.on(PublishCommand).resolves({});

        await handler.handler(event, mockContext, mockCallback);

        expect(dynamoDBMock).toHaveReceivedCommandTimes(PutCommand, 1);
        expect(snsClientMock).toHaveReceivedCommandTimes(PublishCommand, 0);
    });

    it('should log and continue on SNS publish error', async () => {
        process.env.PRODUCTS_TABLE_NAME = 'ProductsTable';
        process.env.CREATE_PRODUCT_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:CreateProductTopic';

        const event = {
            Records: [
                {
                    body: JSON.stringify({
                        title: 'Product 1',
                        price: 10.99,
                        description: 'Description 1',
                    }),
                },
            ],
        };

        dynamoDBMock.on(PutCommand).resolves({});
        snsClientMock.on(PublishCommand).rejects(new Error('SNS publish error'));

        await handler.handler(event, mockContext, mockCallback);

        expect(dynamoDBMock).toHaveReceivedCommandTimes(PutCommand, 1);
        expect(snsClientMock).toHaveReceivedCommandTimes(PublishCommand, 1);
    });
});
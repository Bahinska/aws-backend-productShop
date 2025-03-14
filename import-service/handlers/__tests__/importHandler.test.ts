import { APIGatewayProxyHandler, Callback, Context } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../importHandler/import';

const s3Mock = mockClient(S3Client);

const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'testFunction',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:aws-region:acct-id:function:testFunction',
    memoryLimitInMB: '128',
    awsRequestId: 'awsRequestId',
    logGroupName: 'logGroupName',
    logStreamName: 'logStreamName',
    getRemainingTimeInMillis: () => 30000,
    done: (error?: Error, result?: any): void => { /* no-op */ },
    fail: (error: Error | string): void => { /* no-op */ },
    succeed: (messageOrObject: any): void => { /* no-op */ },
};

const mockCallback: any = (error?: Error | null | undefined, result?: any) => { /* no-op */ };

jest.mock('@aws-sdk/s3-request-presigner');

describe('importProductsFile', () => {
    beforeEach(() => {
        s3Mock.reset();
        jest.resetAllMocks();
    });

    it('should return a signed URL for the given file name', async () => {
        const queryStringParameters = { name: 'example.csv' };
        (getSignedUrl as jest.Mock).mockResolvedValue('https://signed-url.com');
        const event = {
            queryStringParameters: queryStringParameters,
        };

        const result = await handler(event as any, mockContext, mockCallback) as any;
        expect(result.statusCode).toBe(200);
        expect(result.body).toBe('https://signed-url.com');
    });

    it('should return 400 if file name is not provided', async () => {
        const event = {
            queryStringParameters: null,
        };

        const result = await handler(event as any, mockContext, mockCallback) as any;
        expect(result.statusCode).toBe(400);
        expect(result.body).toBe(JSON.stringify({ message: 'File name is required' }));
    });

    it('should return 500 if there is an error generating the signed URL', async () => {
        const queryStringParameters = { name: 'example.csv' };
        (getSignedUrl as jest.Mock).mockRejectedValue(new Error('Error generating signed URL'));
        const event = {
            queryStringParameters: queryStringParameters,
        };

        const result = await handler(event as any, mockContext, mockCallback) as any;
        expect(result.statusCode).toBe(500);
        expect(result.body).toBe(JSON.stringify({ message: 'Error generating signed URL', error: 'Error generating signed URL' }));
    });
});
const { DynamoDB, DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { PublishCommand, SNSClient } = require('@aws-sdk/client-sns');
const uuid = require('uuid');

const dynamoDbClient = new DynamoDBClient(); 
const dynamoDB = DynamoDBDocument.from(new DynamoDB(dynamoDbClient));
const snsClient = new SNSClient();

exports.handler = async (event) => {
    console.log('Batch process started');
    console.log('Event:', JSON.stringify(event, null, 2));

    const productsTableName = process.env.PRODUCTS_TABLE_NAME;
    const createProductTopicArn = process.env.CREATE_PRODUCT_TOPIC_ARN;

    for (const record of event.Records) {
        try {
            const body = JSON.parse(record.body);

            if (!body.title || !body.price || !body.description) {
                throw new Error('Missing product attributes');
            }

            const product = body;
            console.log('Processing product:', product);

            const id = uuid.v4();

            // Add product to DynamoDB
            await dynamoDB.put({
                TableName: productsTableName,
                Item: {
                    id: id,
                    title: product.title,
                    price: product.price,
                    description: product.description,
                },
            });

            console.log(`Product ${product.id} added to DynamoDB`);

            // Publish message to SNS
            await snsClient.send(new PublishCommand({
                TopicArn: createProductTopicArn,
                Message: JSON.stringify(product),
                MessageAttributes: {
                    productId: {
                        DataType: 'String',
                        StringValue: product.id,
                    },
                },
            }));

            console.log(`Message sent to SNS topic for product ${product.id}`);

        } catch (error) {
            console.error('Error processing record:', record);
            console.error('Error message:', error.message);
        }
    }
};
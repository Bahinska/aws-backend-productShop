const {
    DynamoDBDocument,
} = require("@aws-sdk/lib-dynamodb");

const {
    DynamoDB,
} = require("@aws-sdk/client-dynamodb");

const uuid = require('uuid');

const dynamoDB = DynamoDBDocument.from(new DynamoDB());

exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Request body is missing." }),
        };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Invalid JSON format in the request body." }),
        };
    }

    const { title, description, price } = body;

    if (!title || !description || !price) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Title, description, and price are required." }),
        };
    }

    const id = uuid.v4();

    const newProduct = {
        id,
        title,
        description,
        price,
    };

    const params = {
        TableName: process.env.PRODUCTS_TABLE_NAME,
        Item: newProduct,
    };

    try {
        await dynamoDB.put(params);

        return {
            statusCode: 201,
            body: JSON.stringify({ message: "Product created successfully", product: newProduct }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Could not create product" }),
        };
    }
};

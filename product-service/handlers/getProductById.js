const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  };

  try {
    // Log the incoming event to see the request payload
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    const { productId } = event.pathParameters;

    const params = {
      TableName: process.env.PRODUCTS_TABLE_NAME,
      Key: {
        id: productId,
      },
    };

    const result = await dynamo.get(params).promise();

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: headers,
        body: JSON.stringify({
          message: `Product with ID ${productId} not found`
        })
      };
    }

    const stockParams = {
      TableName: process.env.STOCKS_TABLE_NAME,
      Key: {
        product_id: productId,
      },
    };

    const stockResult = await dynamo.get(stockParams).promise();
    const stockCount = stockResult.Item ? stockResult.Item.count : 0;

    const product = result.Item;
    product.count = stockCount;

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        product
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({
        message: 'Failed to retrieve product.',
        error: error.message
      })
    };
  }
};

const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
};

const scanProducts = async () => {
  const scanResults = await dynamo
    .scan({
      TableName: process.env.PRODUCTS_TABLE_NAME,
    })
    .promise();
  return scanResults.Items;
};

const getStockForProduct = async (productId) => {
  const stockData = await dynamo
    .get({
      TableName: process.env.STOCKS_TABLE_NAME,
      Key: {
        product_id: productId,
      },
    })
    .promise();

  return stockData.Item ? stockData.Item.count : 0;
};

exports.handler = async (event) => {
  try {
    // Log the incoming event to see the request payload
    console.log('Received event:', JSON.stringify(event, null, 2));

    const products = await scanProducts();

    const productsWithStock = [];

    for (let product of products) {
      const stockCount = await getStockForProduct(product.id);
      productsWithStock.push({
        ...product,
        count: stockCount,
      });
    }

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(productsWithStock),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({
        message: 'Failed to retrieve product list.',
        error: error.message,
      }),
    };
  }
};

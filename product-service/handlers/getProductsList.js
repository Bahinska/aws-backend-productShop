const {
  DynamoDBDocument,
} = require('@aws-sdk/lib-dynamodb');

const {
  DynamoDB,
} = require('@aws-sdk/client-dynamodb');

const dynamo = DynamoDBDocument.from(new DynamoDB());

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
};

const scanProducts = async () => {
  const scanResults = await dynamo
    .scan({
      TableName: process.env.PRODUCTS_TABLE_NAME,
    });
  return scanResults.Items;
};

const getStockForProduct = async (productId) => {
  const stockData = await dynamo
    .get({
      TableName: process.env.STOCKS_TABLE_NAME,
      Key: {
        product_id: productId,
      },
    });

  return stockData.Item ? stockData.Item.count : 0;
};

exports.handler = async (event) => {
  try {
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

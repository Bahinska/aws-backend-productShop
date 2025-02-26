

const mockProducts = require('../data/mockProducts');

exports.handler = async (event) => {
  try {
    const { productId } = event.pathParameters; // Extract productId from path parameters
    const product = mockProducts.find(p => p.id === productId);
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      };

    if (!product) {
      return {
        statusCode: 404,
        headers: headers,
        body: JSON.stringify({
          message: `Product with ID ${productId} not found`
        })
      };
    }

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

const mockProducts = require('../data/mockProducts');
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
};

exports.handler = async (event) => {
  try {
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(mockProducts)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({
        message: 'Failed to retrieve product list.',
        error: error.message
      })
    };
  }
};
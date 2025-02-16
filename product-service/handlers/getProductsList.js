const mockProducts = require('../data/mockProducts');

exports.handler = async (event) => {
  try {
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: mockProducts
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to retrieve product list.',
        error: error.message
      })
    };
  }
};
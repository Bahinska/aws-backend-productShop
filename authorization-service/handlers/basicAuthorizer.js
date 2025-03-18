const dotenv = require('dotenv');

dotenv.config();

// Help function to generate an IAM policy
var generatePolicy = function (principalId, effect, resource) {
    // Required output:
    var authResponse = {};
    authResponse.principalId = principalId;
    if (effect && resource) {
        var policyDocument = {};
        policyDocument.Version = '2012-10-17'; // default version
        policyDocument.Statement = [];
        var statementOne = {};
        statementOne.Action = 'execute-api:Invoke'; // default action
        statementOne.Effect = effect;
        statementOne.Resource = resource;
        policyDocument.Statement[0] = statementOne;
        authResponse.policyDocument = policyDocument;
    }
    return authResponse;
}

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
};

exports.handler = async (event, context, callback) => {
    console.log('Authorization event', event);

    if (!event.authorizationToken) {
        return callback('Unauthorized');
    }

    const authToken = event.authorizationToken.split(' ')[1];
    const [username, password] = Buffer.from(authToken, 'base64').toString('utf-8').split('=');

    console.log('Credentials', { username, password });

    const storedPassword = process.env[username];

    console.log('Stored password', storedPassword);

    if (!storedPassword || storedPassword !== password) {
        return callback('Forbidden');
    }

    // If authentication is successful, generate a policy
    callback(null, generatePolicy(username, 'Allow', event.methodArn));
};
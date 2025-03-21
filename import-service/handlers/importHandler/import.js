const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({ region: 'eu-north-1' });

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
};

exports.handler = async (event) => {
    const bucketName = process.env.BUCKET_NAME;
    const fileName = event.queryStringParameters?.name

    if (!fileName) {
        return {
            headers: headers,
            statusCode: 400,
            body: JSON.stringify({ message: 'File name is required' }),
        };
    }

    try {
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: `uploaded/${fileName}`,
            ContentType: 'text/csv',
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        return {
            headers: headers,
            statusCode: 200,
            body: signedUrl,
        };
    } catch (error) {
        return {
            headers: headers,
            statusCode: 500,
            body: JSON.stringify({ message: 'Error generating signed URL', error }),
        };
    }
};
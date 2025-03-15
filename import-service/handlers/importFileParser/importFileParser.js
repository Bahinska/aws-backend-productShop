const { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const csv = require('csv-parser');

const region = 'eu-north-1';

const s3Client = new S3Client({ region });
const sqsClient = new SQSClient({ region });

exports.handler = async (event) => {
    console.log("Lambda triggered");
    const bucketName = process.env.BUCKET_NAME;
    const queueUrl = process.env.QUEUE_URL;

    for (const record of event.Records) {
        const key = record.s3.object.key;
        if (!key.startsWith('uploaded/')) continue;

        console.log(`Processing S3 object with key: ${key}`);

        const getObjectParams = { Bucket: bucketName, Key: key };
        const getObjectCommand = new GetObjectCommand(getObjectParams);

        try {
            const data = await s3Client.send(getObjectCommand);
            const readStream = data.Body;
            const csvRows = [];

            // Read the CSV data and push rows to csvRows array
            await new Promise((resolve, reject) => {
                readStream
                    .pipe(csv())
                    .on('data', (row) => {
                        console.log(`Parsed CSV Row: ${JSON.stringify(row)}`);
                        csvRows.push(row);
                    })
                    .on('end', async () => {
                        console.log(`Parsing Completed for ${key}`);
                        resolve(null);
                    })
                    .on('error', (error) => {
                        console.error('Error parsing CSV:', error);
                        reject(error);
                    });
            });

            // Send each CSV row to SQS
            for (const row of csvRows) {
                try {
                    const sendMessageCommand = new SendMessageCommand({
                        QueueUrl: queueUrl,
                        MessageBody: JSON.stringify(row),
                    });

                    await sqsClient.send(sendMessageCommand);
                    console.log(`Successfully sent message to SQS: ${JSON.stringify(row)}`);
                } catch (error) {
                    console.error('Error sending message to SQS:', error);
                }
            }

            // Copy and delete the file after processing
            const parsedKey = key.replace('uploaded', 'parsed');
            const copyObjectParams = {
                Bucket: bucketName,
                CopySource: `${bucketName}/${key}`,
                Key: parsedKey,
            };
            const deleteObjectParams = { Bucket: bucketName, Key: key };

            await s3Client.send(new CopyObjectCommand(copyObjectParams));
            console.log(`File copied from ${key} to ${parsedKey}`);

            await s3Client.send(new DeleteObjectCommand(deleteObjectParams));
            console.log(`File deleted: ${key}`);

        } catch (error) {
            console.error('Error processing S3 event:', error);
            throw error;
        }
    }
};
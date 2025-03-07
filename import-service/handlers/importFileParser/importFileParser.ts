import { S3Event, S3Handler } from 'aws-lambda';
import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as csv from 'csv-parser';
import * as stream from 'stream';

const s3Client = new S3Client({ region: 'eu-north-1' });

export const handler: S3Handler = async (event: S3Event) => {
    console.log("Lambda triggered");
    const bucketName = process.env.BUCKET_NAME;

    for (const record of event.Records) {
        const key = record.s3.object.key;
        if (!key.startsWith('uploaded/')) return;

        const getObjectParams = { Bucket: bucketName, Key: key };
        const getObjectCommand = new GetObjectCommand(getObjectParams);

        try {
            const data = await s3Client.send(getObjectCommand);
            const readStream = data.Body as stream.Readable;

            await new Promise((resolve, reject) => {
                readStream
                    .pipe(csv())
                    .on('data', (row) => {
                        console.log(`Parsed row: ${JSON.stringify(row)}`);
                    })
                    .on('end', async () => {
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
                        resolve(null);
                    })
                    .on('error', (error) => {
                        console.error('Error parsing CSV:', error);
                        reject(error);
                    });
            });
        } catch (error) {
            console.error('Error processing S3 event:', error);
            throw error;
        }
    }
};
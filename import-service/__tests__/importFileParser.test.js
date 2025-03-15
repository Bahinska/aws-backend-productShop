import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { Readable } from 'stream';
import { handler } from '../handlers/importFileParser/importFileParser';

const s3Mock = mockClient(S3Client);

describe('importFileParser', () => {
    beforeEach(() => {
        s3Mock.reset();
    });

    it('should log parsed rows from CSV and move file to parsed folder', async () => {
        // Mock S3 GetObject response
        s3Mock.on(GetObjectCommand).resolves({
            Body: Readable.from(['name,age\nJohn Doe,30\nJane Doe,25']),
        });

        // Mock S3 CopyObject response
        s3Mock.on(CopyObjectCommand).resolves({});

        // Mock S3 DeleteObject response
        s3Mock.on(DeleteObjectCommand).resolves({});

        const event = {
            Records: [
                {
                    s3: {
                        bucket: {
                            name: 'import-bucket-margo1',
                        },
                        object: {
                            key: 'uploaded/example.csv',
                        },
                    },
                },
            ],
        };

        console.log = jest.fn();
        const context = {};
        const callback = () => {};
        await handler(event, context, callback);
        expect(console.log).toHaveBeenCalledWith('Lambda triggered');
        expect(console.log).toHaveBeenCalledWith('Parsed row: {"name":"John Doe","age":"30"}');
        expect(console.log).toHaveBeenCalledWith('Parsed row: {"name":"Jane Doe","age":"25"}');
        expect(console.log).toHaveBeenCalledWith('File copied from uploaded/example.csv to parsed/example.csv');
        expect(console.log).toHaveBeenCalledWith('File deleted: uploaded/example.csv');
    });
});



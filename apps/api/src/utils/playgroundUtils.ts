import { FrameworkType } from "types";
import { getTemplateName } from "./getTemplateName";
import { s3 } from "./s3";
import fs from "fs-extra"
import util from "util"
import { exec } from 'child_process';
import { redis } from "./redis";
import { checkTag } from "./containerUtils";

const execAsync = util.promisify(exec);

// Assuming listedObjects.Contents is an array of S3.ObjectListEntry
async function copyFolderContents(
    sourceBucket: string,
    sourcePrefix: string,
    targetBucket: string,
    targetPrefix: string
): Promise<void> { // Specify return type as Promise<void>
    const listedObjects = await s3.listObjectsV2({ Bucket: sourceBucket, Prefix: sourcePrefix }).promise();
    if (!listedObjects.Contents) return;

    await Promise.all(listedObjects.Contents.map(async (object) => { // Type for object
        if (!object.Key) return; // Add a check for object.Key (optional
        const targetKey = object.Key.replace(sourcePrefix, targetPrefix);

        if (object.Key.endsWith('/')) {
            await s3.putObject({ Bucket: targetBucket, Key: targetKey }).promise();
            await copyFolderContents(sourceBucket, object.Key, targetBucket, targetKey);
        } else {
            await s3.copyObject({
                Bucket: targetBucket,
                CopySource: `${sourceBucket}/${object.Key}`,
                Key: targetKey,
            }).promise();
        }
    }));
}

export const setupPlayground = async (framework: FrameworkType, tag: string) => {
    const templateName = getTemplateName(framework);

    const sourceBucket = 'bytepad';
    const sourcePrefix = `templates/${templateName}/`;
    const targetBucket = 'bytepad';
    const targetPrefix = `playgrounds/${tag}/`;

    try {
        await copyFolderContents(sourceBucket, sourcePrefix, targetBucket, targetPrefix);
        console.log(`Successfully copied template to playground for tag: ${tag}`);
    } catch (error) {
        console.error('Error copying template:', error);
        throw error;
    }
};

export const clearPlayground = async (tag: string) => {
    const containerExists = await checkTag(tag);
    if (containerExists) {
        try {
            await execAsync(`docker stop ${tag}`);
            console.log("Container Stopped")
            await execAsync(`docker rm ${tag}`);
            console.log("Container Removed")
            await execAsync(`rm -rf ./tmp/${tag}`)
            console.log("Files Removed")
            await redis.del(tag);
        }
        catch (e) {
            console.error(e);
        }

    }
}
const deleteFolderRecursive = async (path: string) => {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach((file, index) => {
            const curPath = `${path}/${file}`;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}
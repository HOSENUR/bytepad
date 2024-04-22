import { exec, ExecException } from 'child_process'; // Added type ExecException
import fs, { Dirent } from 'fs-extra'; // Added type Dirent
import util from 'util';
import { redis } from './redis';
import { clearPlayground } from './playgroundUtils';

interface File {
    type: "file" | "dir";
    name: string;
    path?: string; // Added optional path property
}

const execAsync = util.promisify(exec);

const getRandomPort = (): number => {
    return Math.floor(Math.random() * 2000) + 3000;
}

export const createContainer = async (tag: string): Promise<number | void> => { // Added return type Promise<number | void>
    const containerExists = await checkTag(tag)
    const filesExists = fs.existsSync(`./tmp/${tag}`)

    if (filesExists && containerExists) {
        console.log("Container Already Exists For Tag: ", tag);
        return;
    }
    if (!filesExists || !containerExists) {
        await clearPlayground(tag)
    }

    console.log("Creating Container For Tag: ", tag);

    const port = getRandomPort();
    await execAsync(`mkdir -p ./tmp/${tag} && aws s3 cp s3://bytepad/playgrounds/${tag} ./tmp/${tag} --recursive`);
    await execAsync(`docker run -d --name ${tag} -v ./tmp/${tag}:/app -p ${port}:3000 bytepad sh -c "cd /app && bun install && bun dev"`);
    await redis.set(tag, JSON.stringify({ port, lastRequest: Date.now() }));
    console.log(tag, " running on port ", port);
    return port;
}

export const getDirectory = (dir: string, baseDir: string): Promise<File[]> => {
    return new Promise((resolve, reject) => {
        fs.readdir(dir, { withFileTypes: true }, (err: NodeJS.ErrnoException | null, files: Dirent[]) => { // Added types for err and files parameters
            if (err) {
                reject(err);
            } else {
                resolve(files.map(file => ({ type: file.isDirectory() ? "dir" : "file", name: file.name, path: `${baseDir}/${file.name}` })));
            }
        });
    });
}

export const getFile = async (pathToFile: string, tag: string): Promise<string> => { // Added return type Promise<string>
    const prevRedis = JSON.parse(await redis.get(tag) || '{}');
    const updateRedis = { ...prevRedis, lastRequest: Date.now() };
    await redis.set(tag, JSON.stringify(updateRedis));
    return new Promise((resolve, reject) => {
        fs.readFile(pathToFile, 'utf8', (err: NodeJS.ErrnoException | null, data: string) => { // Added types for err and data parameters
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        })
    });
}

export const saveFile = async (file: string, content: string, tag: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        fs.writeFile(file, content, "utf8", (err: NodeJS.ErrnoException | null) => { // Added type for err parameter
            if (err) {
                return reject(err);
            }
            syncFolderToS3(tag).then(() => {
                resolve();
            })
        });
    });
}

// Funciton to Sync Local Folder to S3
function syncFolderToS3(tag: string) { // Added return type Promise<void>
    //also exclude .next  and node_modules
    return execAsync(`aws s3 sync ./tmp/${tag} s3://bytepad/playgrounds/${tag} --exclude ".next/*" --exclude "node_modules/* --exclude ".nuxt/*"`);
}

// Function to check if a docker with  a tag exists and return true or false asynchrnously
export function checkTag(tag: string) {
    return new Promise((resolve, reject) => {
        exec(`docker ps -a -q --filter "name=${tag}"`, (err: ExecException | null, stdout: string, stderr: string) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(stdout ? true : false);
            }
        })
    })
}

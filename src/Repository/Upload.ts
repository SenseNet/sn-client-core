import { PathHelper } from "@sensenet/client-utils";
import { IContent } from "../Models/IContent";
import { IUploadFileOptions, IUploadOptions, IUploadTextOptions } from "../Models/IRequestOptions";
import { Repository } from "../Repository/Repository";
import { UploadResponse } from "./UploadResponse";

/**
 * Helper class for uploading content into the sensenet ECM Repository
 */
export class Upload {

    /**
     * Uploads a specified text as a binary file
     * @param {Repository} repo The repository to use
     * @param {IUploadTextOptions} options The additional options
     */
    public static async textAsFile<T extends IContent>(repo: Repository, options: IUploadTextOptions<T>): Promise<T> {
        const uploadFileOptions = Object.assign({ file: new File([options.text], options.fileName) }, options) as IUploadFileOptions<T>;
        return await this.file(repo, uploadFileOptions);
    }

    /**
     * Uploads a specified file into a sensenet ECM Repository
     * @param {Repository} repo The Repository to use
     * @param {IUploadFileOptions} options The additional upload options
     */
    public static async file<T extends IContent>(repo: Repository, options: IUploadFileOptions<T>): Promise<T> {

        if (this.isChunkedUploadNeeded(options.file, repo)) {
            return await this.uploadChunked(repo, options);
        }
        return await this.uploadNonChunked(repo, options);
    }

    public static isChunkedUploadNeeded(file: File, repo: Repository): boolean {
        return file.size <= repo.configuration.chunkSize;
    }

    private static async uploadNonChunked<T>(repo: Repository, options: IUploadFileOptions<T>): Promise<T> {
        const uploadPath = PathHelper.joinPaths(repo.configuration.repositoryUrl, repo.configuration.oDataToken, options.parentPath, "upload");
        const formData = new FormData();
        formData.append(options.file.name, options.file);
        formData.append("ChunkToken", "0*0*False*False");
        const response = await repo.fetch(uploadPath, {
            credentials: "include",
            method: "POST",
            body: formData,
        });
        if (!response.ok) {
            throw Error(response.statusText);
        }
        return await response.json();
    }

    private static async uploadChunked<T>(repo: Repository, options: IUploadFileOptions<T>): Promise<T> {
        const chunkCount = Math.floor(options.file.size / repo.configuration.chunkSize);

        /** initial chunk data and request */
        const uploadPath = PathHelper.joinPaths(repo.configuration.repositoryUrl, repo.configuration.oDataToken, options.parentPath, "upload");
        const formData = new FormData();
        formData.append(options.file.name, options.file.slice(0, repo.configuration.chunkSize));
        formData.append("UseChunk", "true");
        formData.append("create", "1");
        const initRequest = await repo.fetch(uploadPath, {
            body: formData,
            headers: {
                "Content-Range": `bytes 0-${repo.configuration.chunkSize - 1}/${options.file.size}`,
                "Content-Disposition": `attachment; filename="${options.file.name}"`,
            },
        });

        if (!initRequest.ok) {
            throw Error(initRequest.statusText);
        }

        const chunkToken = await initRequest.json();
        const resp = new UploadResponse(...chunkToken.split("*"));

        /** */
        for (let i = 1; i < chunkCount; i++) {
            const start = i * repo.configuration.chunkSize;
            const end = Math.min(i * repo.configuration.chunkSize, options.file.size - 1);
            const chunkData = options.file.slice(start, end);
            await this.sendChunk<T>(repo, uploadPath, chunkData, chunkToken, start, end, options.file.size, options.file.name);
        }

        return null as any;
    }

    private static async sendChunk<T>(repo: Repository, uploadPath: string, chunk: Blob, chunkToken: string, chunkStart: number, chunkEnd: number, fileSize: number, fileName: string) {
        await repo.fetch(uploadPath, {
            body: {
                UseChunk: true,
                FileLength: fileSize,
                ChunkToken: chunkToken,
            },
        });
    }
}

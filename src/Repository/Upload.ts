import { PathHelper } from "@sensenet/client-utils";
import { IContent } from "../Models/IContent";
import { IUploadFileOptions, IUploadFromEventOptions, IUploadOptions, IUploadTextOptions } from "../Models/IRequestOptions";
import { Repository } from "../Repository/Repository";

/**
 * Response model for Uploads
 */
export interface IUploadResponse {
    /**
     * Identifier for the uploaded content
     */
    Id: number;
    /**
     * Uploaded file lengthj
     */
    Length: number;
    /**
     * Content name
     */
    Name: string;
    /**
     * URL for thumbnail view
     */
    Thumbnail_url: string;
    /**
     * Created content type
     */
    Type: string;
    /**
     * Url for the created content
     */
    Url: string;
}

/**
 * Helper class for uploading content into the sensenet ECM Repository
 */
export class Upload {

    /**
     * Uploads a specified text as a binary file
     * @param {IUploadTextOptions} options The additional options
     */
    public static async textAsFile<T extends IContent>(options: IUploadTextOptions<T>): Promise<IUploadResponse> {
        const uploadFileOptions = Object.assign({ file: new File([options.text], options.fileName) }, options) as IUploadFileOptions<T>;
        return await this.file(uploadFileOptions);
    }

    /**
     * Uploads a specified file into a sensenet ECM Repository
     * @param {IUploadFileOptions} options The additional upload options
     */
    public static async file<T extends IContent>(options: IUploadFileOptions<T>): Promise<IUploadResponse> {

        if (this.isChunkedUploadNeeded(options.file, options.repository)) {
            return await this.uploadChunked(options);
        }
        return await this.uploadNonChunked(options);
    }

    /**
     * Returns if a chunked upload is needed for a specified file
     * @param {File} file The File object
     * @param {Repository} repo The sensenet ECM Repository
     */
    public static isChunkedUploadNeeded(file: File, repo: Repository): boolean {
        return file.size >= repo.configuration.chunkSize;
    }

    private static getUploadUrl(options: IUploadFileOptions<any>) {
        return PathHelper.joinPaths(options.repository.configuration.repositoryUrl, options.repository.configuration.oDataToken, PathHelper.getContentUrl(options.parentPath), "upload");
    }

    private static getFormDataFromOptions(options: IUploadFileOptions<any>) {
        const formData = new FormData();
        formData.append("ChunkToken", "0*0*False*False");
        formData.append("FileName", options.file.name);
        formData.append("Overwrite", options.overwrite.toString());
        formData.append("PropertyName", options.binaryPropertyName.toString());
        formData.append("FileLength", options.file.size.toString());
        formData.append("ContentType", options.contentTypeName.toString());
        return formData;
    }

    private static async uploadNonChunked<T>(options: IUploadFileOptions<T>): Promise<IUploadResponse> {
        const formData = this.getFormDataFromOptions(options);
        formData.append(options.file.name, options.file);
        const response = await options.repository.fetch(this.getUploadUrl(options), {
            credentials: "include",
            method: "POST",
            body: formData,
        });
        if (!response.ok) {
            throw Error(response.statusText);
        }
        return await response.json();
    }

    private static async uploadChunked<T>(options: IUploadFileOptions<T>) {
        const chunkCount = Math.floor(options.file.size / options.repository.configuration.chunkSize);
        const uploadPath = this.getUploadUrl(options);

        /** initial chunk data and request */
        const formData = this.getFormDataFromOptions(options);
        formData.append(options.file.name, options.file.slice(0, options.repository.configuration.chunkSize));
        formData.append("UseChunk", "true");
        formData.append("create", "1");
        const initRequest = await options.repository.fetch(uploadPath, {
            body: formData,
            credentials: "include",
            method: "POST",
            headers: {
                "Content-Range": `bytes 0-${options.repository.configuration.chunkSize - 1}/${options.file.size}`,
                "Content-Disposition": `attachment; filename="${options.file.name}"`,
            },
        });

        if (!initRequest.ok) {
            throw Error(initRequest.statusText);
        }

        const chunkToken = await initRequest.text();
        let lastResponseContent: IUploadResponse = {} as any;

        /** */
        for (let i = 0; i <= chunkCount; i++) {
            const start = i * options.repository.configuration.chunkSize;
            let end = start + options.repository.configuration.chunkSize;
            end = end > options.file.size ? options.file.size : end;

            const chunkFormData = new FormData();
            const chunkData = options.file.slice(start, end);

            chunkFormData.append("FileLength", options.file.size.toString());
            chunkFormData.append("ChunkToken", chunkToken);
            chunkFormData.append(options.file.name, chunkData);

            const lastResponse = await options.repository.fetch(uploadPath, {
                body: chunkFormData,
                credentials: "include",
                method: "POST",
                headers: {
                    "Content-Range": `bytes ${start}-${end - 1}/${options.file.size}`,
                    "Content-Disposition": `attachment; filename="${options.file.name}"`,
                },
            });
            if (lastResponse.ok) {
                lastResponseContent = await lastResponse.json();
            } else {
                throw Error(lastResponse.statusText);
            }
        }

        return lastResponseContent;

    }

    private static async webkitFileHandler<T extends IContent>(fileEntry: WebKitFileEntry, contentPath: string, options: IUploadOptions<T>) {
        await new Promise((resolve, reject) => {
            fileEntry.file(async (f) => {
                await this.file({
                    file: f as any as File,
                    ...options,
                    parentPath: contentPath,
                });
                resolve();
            }, (err) => reject(err));
        });
    }

    private static async webkitDirectoryHandler<T extends IContent>(directory: WebKitDirectoryEntry, contentPath: string, options: IUploadOptions<T>) {
        const folder =  await options.repository.post({
            content: {
                Name: directory.name,

            },
            parentPath: contentPath,
            contentType: "Folder",
        });
        const dirReader = directory.createReader();
        await new Promise((resolve, reject) => {
            dirReader.readEntries(async (items) => {
                await this.webkitItemListHandler<T>(items as any, folder.d.Path, true, options);
                resolve();
            }, (err) => reject(err));
        });
    }

    private static async webkitItemListHandler<T extends IContent>(items: Array<WebKitFileEntry | WebKitDirectoryEntry>, contentPath: string, createFolders: boolean, options: IUploadOptions<T>) {
        // tslint:disable-next-line:forin
        for (const item of items) {
            if (createFolders && item.isDirectory) {
                await this.webkitDirectoryHandler(item as WebKitDirectoryEntry, contentPath, options);
            }
            if (item.isFile) {
                await this.webkitFileHandler(item as WebKitFileEntry, contentPath, options);
            }
        }
    }

    /**
     * Uploads content from a specified Drop Event
     * @param { IUploadOptions } options Options for the Upload request
     */
    public static async fromDropEvent<T extends IContent = IContent>(options: IUploadFromEventOptions<T>) {
        if ((window as any).webkitRequestFileSystem) {
            const entries: Array<WebKitFileEntry | WebKitDirectoryEntry> =
                [].map.call(options.event.dataTransfer.items, (i: DataTransferItem) => i.webkitGetAsEntry());

            await this.webkitItemListHandler<T>(entries, options.parentPath, options.createFolders, options);
        } else {
            // Fallback for non-webkit browsers.
            [].forEach.call(options.event.dataTransfer.files, async (f: File) => {
                if (f.type === "file") {
                    return await Upload.file({
                        file: f,
                        ...options as IUploadOptions<T>,
                    });
                }
            });
        }

    }
}

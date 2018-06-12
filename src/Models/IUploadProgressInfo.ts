import { IUploadResponse } from "../Repository/Upload";

/**
 * Defines an upload progress info data model
 */
export interface IUploadProgressInfo {
    /**
     * Basic info about the created Content
     */
    createdContent: IUploadResponse;
    /**
     * Total chunks count
     */
    chunkCount: number;
    /**
     * Uploaded chunks
     */
    uploadedChunks: number;
    /**
     * Flag that indicates if the upload has been completed
     */
    completed: boolean;

    /**
     * If an error has been occured, it will be persisted in the progress info
     */
    error?: any;
}

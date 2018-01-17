export class UploadResponse {
    /**
     * The ID of the created Content
     */
    public contentId: number;
    /**
     * The Chunk token that can be used during upload
     */
    public chunkToken: string;
    /**
     * Flag that indicates if the Content should be finialized after upload
     */
    public mustFinialize: boolean;
    /**
     * Flag that indicates if the Content should be checked in after upload
     */
    public mustCheckin: boolean;

    constructor(...args: any[]) {
        this.contentId = parseInt(args[0], 0);
        this.chunkToken = args[1];
        this.mustFinialize = args[2];
        this.mustCheckin = args[3];
    }
}

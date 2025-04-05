export class Upload {
    $key?: string;
    name?: string;
    description?: string;
    file: File;
    url?: string;
    progress?: number;
    createdOn?: Date;

    constructor(file: File){
        this.file = file;
    }
}
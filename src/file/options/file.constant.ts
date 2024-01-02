import { FileTypeDto } from "../dto/file.dto";

export class FileTypeConstant {
    FILE: RegExp;

    setFileTypes(fileTypes: FileTypeDto[]) {
        if (!fileTypes) throw new Error('File types not found');
        let types = fileTypes.map(fileType => fileType.name);
        const regexFormat = new RegExp(`(${types.join('|')})$`);
        this.FILE = regexFormat;
    }
}


export class FileDestinationConstant {
    static readonly DEST = './assets/files/uploads';
}


// todo sadece file id ve type donsun
import { HttpException, HttpStatus } from "@nestjs/common";
import { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
import { diskStorage } from 'multer';
import { FileDestinationConstant, FileTypeConstant } from "./file.constant";
import axios from 'axios';
import { config } from 'dotenv';

config();
const fileTypeConstant = new FileTypeConstant;

export const FileUploadOptions = (): MulterOptions => ({
    dest: FileDestinationConstant.DEST,
    limits: {
        fileSize: 2097152, // 2MB
    },
    storage: diskStorage({
        destination: FileDestinationConstant.DEST,
        filename(req, file, cb) {
            const randomName = Array(32)
                .fill(null)
                .map(() => (Math.round(Math.random() * 16)).toString(16))
                .join('');
            return cb(null, `${randomName}.${file.originalname.split('.')[1]}`);
        },
    }),
    fileFilter: async (req, file, cb) => {
        const type = file.originalname.split('.')[1];
        const response = await axios.get(process.env.GET_FILE_TYPES_API_ROUTE);
        if (response.data.length < 1) return cb(new HttpException('File types not found', HttpStatus.NOT_FOUND), false);
        fileTypeConstant.setFileTypes(response.data);

        const findType = fileTypeConstant.FILE.test(type);

        if (!findType) { return cb(new HttpException('File format wrong!', HttpStatus.NOT_FOUND), false); }

        return cb(null, true);
    }
});


export const FileApiOptions = () => ({ // Swagger Api Options
    schema: {
        type: 'object',
        properties: {
            file: {
                type: 'string',
                format: 'binary',
            },
        },
    },
})
import { HttpException, HttpStatus } from "@nestjs/common";
import { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
import { config } from 'dotenv';
import { diskStorage } from 'multer';
import { FileDestinationConstant, FileTypeConstant } from "./file.constant";

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
        const type = file.originalname.split('.')[file.originalname.split('.').length - 1];
        // Öncül basit filtrasyon
        if(type.toLowerCase() === 'exe' || type.toLowerCase() === 'sql') {
            return cb(new HttpException('File type not allowed', HttpStatus.BAD_REQUEST), false);
        }
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
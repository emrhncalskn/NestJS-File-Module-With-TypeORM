import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import { FileDto, FileTypeDto } from './dto/file.dto';
import { FileDestinationConstant, FileTypeConstant } from './options/file.constant';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from './entities/file.entity';
import { FileType } from './entities/file_type.entity';
import { Response } from 'express';

@Injectable()
export class FileService {

    constructor(
        @InjectRepository(File)
        private fileRepository: Repository<File>,
        @InjectRepository(FileType)
        private fileTypeRepository: Repository<FileType>,
    ) { }

    async listFilePaths(path: string) {
        let documents = [];

        try {
            let files = [];
            if (path == 'all' || path == 'All' || path == 'ALL') {
                files = await fsPromises.readdir(FileDestinationConstant.DEST, { recursive: true, encoding: 'utf-8' });
                files.forEach(file => {
                    const new_path = file.replace(/\\/g, '/');
                    if (new_path.split('/').length < 2) { return; } // Exclude files when listing all items ('all', 'All', or 'ALL'), only include directories.
                    documents.push({ file: `/${new_path}` });
                });
            } else {
                files = await fsPromises.readdir(FileDestinationConstant.DEST + path);
                files.forEach(file => {
                    documents.push({ file: `${path}/${file}` });
                });
            }

            return { documents };
        } catch (err) {
            console.error('File reading error:', err);
            return { documents: [] };
        }
    }

    async uploadFile(file: FileDto, route: string, res: Response) {
        try {
            // **** Geçiçi olarak yüklenen dosya üzerinden type kontrolu sağlanıyor. ****
            const fileTypeConstant = new FileTypeConstant;
            fileTypeConstant.setFileTypes(await this.getFileTypes());
            const tempFileBuffer = fs.readFileSync(file.path); // Geçiçi olarak yüklenen dosya okunuyor.
            const fileTypeFromBuffer = await import('file-type').then(({fromBuffer}) => fromBuffer(tempFileBuffer) ); // file bufferdan mime type cekıldı.
            if (fileTypeFromBuffer == undefined || !fileTypeFromBuffer.mime){ // eğer mime type yoksa dosya silinir ve hata döndürülür.
                fs.unlinkSync(file.path); // kabul edilmediği için dosya silindi.
                return res.status(400).json({ message : 'File type cannot read.' });
            } 
            const isAccepted = fileTypeConstant.FILE_TYPES.map(fileType => { // file type kontrolu
                if (fileType.mime_type == fileTypeFromBuffer.mime) {
                    return true; // file type kabul edildi.
                }
            });
            if (!isAccepted.includes(true)) { // file type kontrolu , eğer biri bile true döndürmezse kabul edilmedi.
                fs.unlinkSync(file.path); // kabul edilmediği için dosya silindi.
                return res.status(400).json({ message : 'File type not accepted.', file_extension : fileTypeFromBuffer.ext, file_mime_type : fileTypeFromBuffer.mime});
            }
            // **** Geçiçi olarak yüklenen dosya üzerinden type kontrolu sağlanıyor. ****

            const fileType = fileTypeConstant.FILE_TYPES.find(type => type.mime_type == fileTypeFromBuffer.mime);
            
            let filePath = fileType.type;
            const pathFix = file.path.replace(/\\/g, '/'), oldPath = pathFix.replace(file.filename, '');
            const newPath = `${oldPath}${route}/${filePath}`;

            file.originalname = await this.fillEmpty(file.originalname);
            file.alt = await this.fillEmpty(file.originalname);
            file.destination += `/${route}/${filePath}/${file.filename}`;
            file.type_id = fileType.id;
            file.path = `/${route}/${filePath}/${file.filename}`;

            const create = this.fileRepository.create(file);
            await this.fileRepository.save(create);

            const { originalname, alt, destination, filename, size, path, type, ...result } = create;

            if (!fs.existsSync(newPath)) { fs.mkdirSync(newPath, { recursive: true }); }
            fs.renameSync(`${oldPath}${file.filename}`, `${newPath}/${file.filename}`);
            return res.status(HttpStatus.OK).json(result);
        }
        catch (err) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: err.message });
        }
    }

    async createFileType(file_type: FileTypeDto) {
        try {
            const create_type = this.fileTypeRepository.create(file_type);
            await this.fileTypeRepository.save(create_type);
            return create_type;
        }
        catch (err) {
            throw new HttpException('File type already exist', HttpStatus.BAD_REQUEST);
        }
    }

    async deleteFileType(name: string) {
        const file_type = await this.findFileType(name);
        if (!file_type) { throw new HttpException('File type not found', HttpStatus.NOT_FOUND); }
        await this.fileTypeRepository.delete(file_type.id);
        return { message: 'File type deleted successfully' };
    }

    async findFileById(id: number) {
        const file = await this.fileRepository.findOne({ where: { id } });
        if (!file) { throw new HttpException('File not found', HttpStatus.NOT_FOUND); }
        return file;
    }

    async findFileByPath(path: string) {
        const file = await this.fileRepository.findOne({ where: { path } });
        if (!file) { throw new HttpException('File not found', HttpStatus.NOT_FOUND); }
        return file;
    }

    async getFileByType(type: string, res: Response) {
        try {
            const result = await this.findFilesByType(type);
            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            res.status(HttpStatus.NOT_FOUND).json({ message: error.message });
        }
    }


    async findFileType(name: string) {
        const file_type = await this.fileTypeRepository.findOne({ where: { name } });
        if (!file_type) { throw new HttpException('File type not found', HttpStatus.NOT_FOUND); }
        return file_type;
    }

    async getFiles() {
        const files = await this.fileRepository.find();
        if (files.length < 1) { throw new HttpException('File not found', HttpStatus.NOT_FOUND); }
        return files;
    }

    async getFileTypes() {
        const file_types = await this.fileTypeRepository.find();
        if (file_types.length < 1) { return []; }
        return file_types;
    }

    async findFilesByType(type: string) {
        const file_type = await this.findFileType(type);
        if (!file_type) { throw new HttpException('File type not found', HttpStatus.NOT_FOUND); }
        const files = await this.fileRepository.find({ where: { type_id: file_type.id } });
        if (files.length < 1) { throw new HttpException('File not found', HttpStatus.NOT_FOUND); }
        return files;
    }

    async deleteFolderIfEmpty(folderPath: string) {
        try {
            const isFileExists = await this.isFileExists(folderPath);
            if (!isFileExists) { return await this.deleteFolderIfEmpty(folderPath.substring(0, folderPath.lastIndexOf('/'))) }
            const folderContents = await fsPromises.readdir(folderPath);
            if (folderContents.length === 0) {
                // If the folder is empty, check the previous folder
                const parentFolderPath = folderPath.substring(0, folderPath.lastIndexOf('/')); // Path to the previous folder
                await fsPromises.rm(folderPath, { recursive: true }); // Check the previous folder and delete it if it is empty
                if (parentFolderPath !== FileDestinationConstant.DEST) { // If the path to the previous folder is not the path to the main folder
                    await this.deleteFolderIfEmpty(parentFolderPath);
                }
            }
        } catch (error) {
            console.error('Error while checking and deleting folder:', error);
        }
    }

    async deleteFile(id: number) {
        let msg = null;
        const file = await this.findFileById(id);
        if (!file) { throw new HttpException('File not found', HttpStatus.NOT_FOUND); }

        let path = file.path;
        console.log('path', path)
        console.log(file)
        console.log(id)
        await this.fileRepository.delete(file.id);

        const isFileExists = await this.isFileExists(FileDestinationConstant.DEST + path);
        if (!isFileExists) {
            msg = 'File not found on folder path but successfully deleted anyway.';
        }

        try { // if someone delete file by manually
            await fsPromises.unlink(FileDestinationConstant.DEST + path);
        } catch (error) {
            msg = 'File not found on folder path but successfully deleted anyway.';
        }

        // Delete folder and previous folder
        await this.deleteFolderIfEmpty(FileDestinationConstant.DEST + path);
        if (msg) throw new HttpException(msg, HttpStatus.OK)
        throw new HttpException('File deleted successfully', HttpStatus.OK);
    }

    async isFileExists(path: string) {
        return new Promise((resolve, reject) => {
            fs.access(path, fs.constants.F_OK, (error) => {
                if (error) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    }

    async convertTurkishWords(text: string) {
        const turkishChars = 'çğıöşüÇĞİÖŞÜ ';
        const englishChars = 'cgiosuCGIOSU-';

        let result = '';

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const index = turkishChars.indexOf(char);

            if (index !== -1) {
                result += englishChars[index];
            } else {
                result += char === ' ' ? '-' : char;
            }
        }

        return result.toLowerCase();
    }

    async fillEmpty(value: string) {
        const tr = await this.convertTurkishWords(value);
        const text = tr
            .toLowerCase()
            .replace(/[\s_-]+/g, '_')
            .trim();
        return text;
    }

}

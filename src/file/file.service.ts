import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import { FileDto, FileTypeDto } from './dto/file.dto';
import { FileDestinationConstant } from './options/file.constant';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from './entities/file.entity';
import { FileType } from './entities/file_type.entity';

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
                    documents.push({ file: `/${path}/${file}` });
                });
            }

            return { documents };
        } catch (err) {
            console.error('File reading error:', err);
            return { documents: [] };
        }
    }

    async uploadFile(file: FileDto, route: string) {

        const type = file.originalname.split('.')[1];
        file.alt = await this.fillEmpty(file.originalname);

        const findType = await this.findFileType(type);
        if (!findType) { throw new HttpException('File not found', HttpStatus.NOT_FOUND); }

        let path = findType.type;
        const pathFix = file.path.replace(/\\/g, '/'), oldPath = pathFix.replace(file.filename, '');
        const newPath = `${oldPath}${route}/${path}`;

        file.originalname = await this.fillEmpty(file.originalname);
        file.destination += `/${route}/${path}/${file.filename}`;
        file.type_id = findType.id;
        file.path = `/${route}/${path}/${file.filename}`;

        const create = this.fileRepository.create(file);
        await this.fileRepository.save(create);


        if (!fs.existsSync(newPath)) { fs.mkdirSync(newPath, { recursive: true }); }
        fs.renameSync(`${oldPath}${file.filename}`, `${newPath}/${file.filename}`);
        return create;
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

    async getFilesByType(type: string) {
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

    async deleteFile(path: string) {
        let msg = null;
        const file = await this.findFileByPath(path);
        if (!file) { throw new HttpException('File not found', HttpStatus.NOT_FOUND); }

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

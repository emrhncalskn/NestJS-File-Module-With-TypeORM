import { Body, Controller, FileTypeValidator, Get, Param, ParseFilePipe, Post, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileTypeDto } from './dto/file.dto';
import { FileService } from './file.service';
import { FileTypeConstant } from './options/file.constant';
import { FileApiOptions, FileUploadOptions } from './options/file.options';
import { Response } from 'express';

const fileTypeConstant = new FileTypeConstant;

@ApiTags('File')
@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) { }

  @Post('upload/:route')
  @ApiConsumes('multipart/form-data') @ApiBody(FileApiOptions())
  @UseInterceptors(FileInterceptor('file', FileUploadOptions())) // FileType REpository den cekılecek.
  async uploadImage(@Param('route') route: string, @UploadedFile(
    new ParseFilePipe({ 
      validators: [new FileTypeValidator({ fileType: fileTypeConstant.FILE })] 
    })) file: Express.Multer.File, @Res() res: Response) {
    return await this.fileService.uploadFile(file, route, res);
  }

  @Get()
  async getFiles() {
    return await this.fileService.getFiles();
  }

  @Get('byid/:id')
  async getFileById(@Param('id') id: number) {
    return await this.fileService.findFileById(id);
  }

  @Get('bypath/:path')
  async getFileByPath(@Param('path') path: string) {
    return await this.fileService.findFileByPath(path);
  }

  @Get('bytype/:type')
  async getFileByType(@Param('type') type: string, @Res() res: Response) {
    return await this.fileService.getFileByType(type, res);
  }

  @Get('type/:name')
  async getFileType(@Param('name') name: string) {
    return await this.fileService.findFileType(name);
  }

  @Get('types')
  async getTypes() {
    return await this.fileService.getFileTypes();
  }

  @Get('list/:path')
  async listFilePaths(@Param('path') path: string) {
    return await this.fileService.listFilePaths(path);
  }

  @Post('create/type')
  async createFileType(@Body() type: FileTypeDto) {
    return await this.fileService.createFileType(type);
  }

  @Get('delete/type/:name')
  async deleteFileType(@Param('name') name: string) {
    return await this.fileService.deleteFileType(name);
  }

  @Get('delete/:id')
  async deleteFile(@Param('id') id: number) {
    return await this.fileService.deleteFile(Number(id));
  }
}
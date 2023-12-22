import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FileModule } from './file/file.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { FileDestinationConstant } from './file/options/file.constant';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

@Module({
  imports: [TypeOrmModule.forRoot({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: +process.env.DB_PORT,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    autoLoadEntities: true,
    multipleStatements: true,
  }), ServeStaticModule.forRoot({
    rootPath: join(__dirname, '../..', FileDestinationConstant.DEST),
  }), ConfigModule.forRoot({
    isGlobal: true, // no need to import into other modules
  }), FileModule],
  controllers: [AppController],
  providers: [AppService, ConfigService],
})
export class AppModule { }

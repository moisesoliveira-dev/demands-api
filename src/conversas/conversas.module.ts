import { Module } from '@nestjs/common';
import { ConversasController } from './conversas.controller.js';
import { ConversasService } from './conversas.service.js';
import { S3Service } from './s3.service.js';

@Module({
    controllers: [ConversasController],
    providers: [ConversasService, S3Service],
    exports: [ConversasService, S3Service],
})
export class ConversasModule { }

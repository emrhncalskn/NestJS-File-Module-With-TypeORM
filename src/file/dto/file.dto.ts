import { ApiProperty } from "@nestjs/swagger";

export class FileDto {
    originalname: string;
    filename: string;
    alt?: string;
    destination: string;
    path: string;
    size: number;
    type_id?: number;
}

export class FileTypeDto {
    id: number;
    @ApiProperty()
    name: string;
    @ApiProperty()
    type: string;
}


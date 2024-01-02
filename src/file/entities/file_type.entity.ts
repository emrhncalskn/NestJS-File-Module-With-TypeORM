import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { File } from "../entities/file.entity";

@Entity('file_type')
export class FileType {
    @PrimaryGeneratedColumn()
    id: number;
    @Column({ unique: true })
    name: string;
    @Column()
    type: string;
    @Column({ nullable: true})
    mime_type: string;
    @OneToMany(() => File, (file) => file.type)
    files: File[];
}


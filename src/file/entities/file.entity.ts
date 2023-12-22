import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { FileType } from "../entities/file_type.entity";

@Entity('file')
export class File {
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    originalname: string;
    @Column()
    filename: string;
    @Column()
    alt: string;
    @Column({ type: 'longtext' })
    destination: string;
    @Column({ type: 'longtext' })
    path: string;
    @Column()
    size: number;
    @Column()
    type_id: number;

    @ManyToOne(() => FileType, (file_type) => file_type.files)
    @JoinColumn({ name: 'type_id', referencedColumnName: 'id', foreignKeyConstraintName: 'FK_File_FileType' })
    type: FileType;

}

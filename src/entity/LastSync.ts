import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, DeleteDateColumn, UpdateDateColumn, PrimaryColumn } from "typeorm"

@Entity()
export class LastSync {
    @PrimaryColumn()
    table: string

    @Column()
    lastSyncedAt: number

    @CreateDateColumn({ nullable: true })
    createdAt?: Date

    @UpdateDateColumn({ nullable: true })
    modifiedAt?: Date

    @DeleteDateColumn({ nullable: true })
    deletedAt?: Date
}

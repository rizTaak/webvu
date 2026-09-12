import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Website } from './website.entity';

export type UserRole = 'user' | 'admin' | 'support';

/** SPEC.md § Entities — `User`. */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 254 })
  email!: string;

  @Column({ type: 'varchar', length: 120 })
  displayName!: string;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'enum', enum: ['user', 'admin', 'support'], default: 'user' })
  role!: UserRole;

  /** Starts the 14-day deletion grace window. */
  @Column({ type: 'timestamptz', nullable: true })
  deletionRequestedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @OneToOne('Website', (website: Website) => website.owner)
  website?: Website;
}

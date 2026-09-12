import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * SPEC.md § Authentication — provider linkage lives here rather than as a
 * `googleId` column on User.
 *
 * This is why adding Microsoft or Facebook later needs a new Passport
 * strategy and nothing else: no entity changes, no migration. The dev-stub
 * provider writes rows here too, so the linking path is exercised from day
 * one rather than first being used when Google arrives.
 */
@Entity('oauth_accounts')
@Index('idx_oauth_provider_subject', ['provider', 'providerId'], { unique: true })
export class OAuthAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  /** e.g. `google`, `dev`. */
  @Column({ type: 'varchar', length: 32 })
  provider!: string;

  /** The subject id from the provider. */
  @Column({ type: 'varchar', length: 255 })
  providerId!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

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
 * SPEC.md § Domains & Session Model — refresh tokens are single-use and
 * rotated on every refresh.
 *
 * Only the SHA-256 hash is stored: a database dump must not yield usable
 * sessions. `familyId` groups a rotation chain so that replaying a consumed
 * token can revoke every descendant at once — the standard detection for a
 * stolen token, since the legitimate holder and the thief cannot both
 * successfully rotate the same one.
 */
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_refresh_user')
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  /** SHA-256 of the raw token. The raw value is never persisted. */
  @Index('idx_refresh_token_hash', { unique: true })
  @Column({ type: 'varchar', length: 64 })
  tokenHash!: string;

  @Index('idx_refresh_family')
  @Column({ type: 'uuid' })
  familyId!: string;

  /** Set the first time this token is exchanged. A second exchange is reuse. */
  @Column({ type: 'timestamptz', nullable: true })
  consumedAt!: Date | null;

  /** Set when the family is revoked, by reuse detection or by logout. */
  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

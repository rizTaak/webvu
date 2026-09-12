import type { Footer, Header, Page, Theme } from '@webvu/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'cancelled'
  | 'trial_expired';

/** Statuses whose websites are still served publicly. SPEC.md § Billing States. */
export const SERVED_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  'trialing',
  'active',
  'past_due',
];

/** SPEC.md § Entities — `Website`. */
@Entity('websites')
export class Website {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Uniqueness is enforced by a unique index on `lower(slug)`, created in the
   * migration — an expression index cannot be declared with @Index here.
   */
  @Column({ type: 'varchar', length: 30 })
  slug!: string;

  @Column({ type: 'varchar', length: 60 })
  name!: string;

  @Column({ type: 'varchar', length: 3, default: 'GBP' })
  currency!: string;

  @Column({ type: 'varchar', length: 254 })
  notificationEmail!: string;

  @Column({ type: 'boolean', default: false })
  notificationEmailVerified!: boolean;

  @Column({ type: 'varchar', length: 254, nullable: true })
  pendingNotificationEmail!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  termsAcceptedAt!: Date | null;

  // --- Live snapshot: what visitors see ------------------------------------
  @Column({ type: 'jsonb' })
  theme!: Theme;

  @Column({ type: 'jsonb' })
  header!: Header;

  @Column({ type: 'jsonb' })
  footer!: Footer;

  @Column({ type: 'jsonb' })
  pages!: Page[];

  // --- Draft: what the dashboard edits -------------------------------------
  @Column({ type: 'jsonb' })
  draftTheme!: Theme;

  @Column({ type: 'jsonb' })
  draftHeader!: Header;

  @Column({ type: 'jsonb' })
  draftFooter!: Footer;

  @Column({ type: 'jsonb' })
  draftPages!: Page[];

  /** Optimistic concurrency token for draft saves. */
  @Column({ type: 'timestamptz', default: () => 'now()' })
  draftUpdatedAt!: Date;

  // --- Publish state -------------------------------------------------------
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  /** Distinguishes a deliberate unpublish from a billing suspension. */
  @Column({ type: 'boolean', default: false })
  unpublishedByUser!: boolean;

  // --- Billing -------------------------------------------------------------
  @Column({ type: 'timestamptz', nullable: true })
  trialEndsAt!: Date | null;

  @Column({
    type: 'enum',
    enum: ['trialing', 'active', 'past_due', 'unpaid', 'cancelled', 'trial_expired'],
    default: 'trialing',
  })
  subscriptionStatus!: SubscriptionStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeCustomerId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeSubscriptionId!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  currentPeriodEnd!: Date | null;

  // --- Ownership -----------------------------------------------------------
  @Index({ unique: true })
  @Column({ type: 'uuid' })
  ownerId!: string;

  @OneToOne(() => User, (user) => user.website, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner?: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

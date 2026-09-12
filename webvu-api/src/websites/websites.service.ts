import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { WebsiteSnapshot } from '@webvu/shared';
import {
  SERVED_SUBSCRIPTION_STATUSES,
  Website,
} from '../database/entities/website.entity';

/**
 * Why a website is not being served publicly. Surfaced to the renderer as
 * `X-Webvu-Reason` so it can choose the right 404 page — an unknown slug and
 * a suspended website look identical to a visitor but not to the renderer.
 */
export type UnavailableReason =
  | 'not-found'
  | 'unpublished'
  | 'unverified'
  | 'suspended';

export type LiveSnapshotResult =
  | { available: true; snapshot: WebsiteSnapshot }
  | { available: false; reason: UnavailableReason };

@Injectable()
export class WebsitesService {
  constructor(
    @InjectRepository(Website)
    private readonly websites: Repository<Website>,
  ) {}

  /** The caller's own website, resolved from the JWT subject only. */
  async findByOwner(ownerId: string): Promise<Website | null> {
    return this.websites.findOneBy({ ownerId });
  }

  /** Case-insensitive, matching the unique index on lower(slug). */
  async findBySlug(slug: string): Promise<Website | null> {
    return this.websites
      .createQueryBuilder('website')
      .where('lower(website.slug) = lower(:slug)', { slug })
      .getOne();
  }

  /**
   * The live snapshot for the SSR renderer.
   *
   * SPEC.md § Entities — a website is served publicly only when it is
   * published, not unpublished by its owner, has a verified notification
   * email, and its subscription is in a served state.
   */
  async getLiveSnapshot(slug: string): Promise<LiveSnapshotResult> {
    const website = await this.findBySlug(slug);
    if (!website) {
      return { available: false, reason: 'not-found' };
    }

    const reason = unavailableReasonFor(website);
    if (reason) {
      return { available: false, reason };
    }

    return { available: true, snapshot: toSnapshot(website) };
  }
}

export function unavailableReasonFor(website: Website): UnavailableReason | null {
  if (!website.notificationEmailVerified) return 'unverified';
  if (!SERVED_SUBSCRIPTION_STATUSES.includes(website.subscriptionStatus)) {
    return 'suspended';
  }
  if (website.publishedAt === null || website.unpublishedByUser) return 'unpublished';
  return null;
}

/**
 * What the dashboard sees: both snapshots plus publish and billing state.
 * Distinct from toSnapshot, which is the public view and must never leak
 * draft content or billing details.
 */
export function toOwnerView(website: Website) {
  return {
    slug: website.slug,
    name: website.name,
    currency: website.currency,
    notificationEmail: website.notificationEmail,
    notificationEmailVerified: website.notificationEmailVerified,
    live: website.publishedAt ? toSnapshot(website) : null,
    draft: {
      slug: website.slug,
      name: website.name,
      theme: website.draftTheme,
      header: website.draftHeader,
      footer: website.draftFooter,
      pages: website.draftPages,
    },
    draftUpdatedAt: website.draftUpdatedAt,
    publishedAt: website.publishedAt,
    unpublishedByUser: website.unpublishedByUser,
    hasUnpublishedChanges:
      website.publishedAt === null ||
      website.draftUpdatedAt.getTime() > website.publishedAt.getTime(),
    subscriptionStatus: website.subscriptionStatus,
    trialEndsAt: website.trialEndsAt,
    isPubliclyServed: unavailableReasonFor(website) === null,
  };
}

export function toSnapshot(website: Website): WebsiteSnapshot {
  return {
    slug: website.slug,
    name: website.name,
    theme: website.theme,
    header: website.header,
    footer: website.footer,
    pages: website.pages,
  };
}

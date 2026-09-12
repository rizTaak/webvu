import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { RequestWithUser } from '../auth/jwt-auth.guard';
import type { Website } from '../database/entities/website.entity';
import { WebsitesService } from './websites.service';

export interface RequestWithWebsite extends RequestWithUser {
  website: Website;
}

/**
 * Resolves the caller's website from the JWT subject and attaches it.
 * SPEC.md § Guards & Roles.
 *
 * The website is never taken from a client-supplied id, so there is no
 * parameter to tamper with: a user can only ever address their own. A user
 * with no website yet gets 404, which is how the dashboard detects that
 * onboarding is still needed.
 */
@Injectable()
export class WebsiteOwnerGuard implements CanActivate {
  constructor(private readonly websites: WebsitesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const website = await this.websites.findByOwner(request.user.sub);
    if (!website) throw new NotFoundException('No website for this account');

    (request as RequestWithWebsite).website = website;
    return true;
  }
}

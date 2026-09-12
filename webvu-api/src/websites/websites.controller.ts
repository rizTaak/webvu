import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WebsiteOwnerGuard, type RequestWithWebsite } from './website-owner.guard';
import { WebsitesService, toOwnerView } from './websites.service';

@ApiTags('websites')
@Controller('websites')
export class WebsitesController {
  constructor(private readonly websites: WebsitesService) {}

  /**
   * The caller's own website: draft, live, publish state and billing state.
   *
   * Declared before the `:slug` route so the literal segment wins — otherwise
   * a request for /websites/me would be treated as a website with the slug
   * "me". ("me" is not in RESERVED_SLUGS precisely because it is never
   * reachable as one; route order is what guarantees that.)
   */
  @Get('me')
  @UseGuards(JwtAuthGuard, WebsiteOwnerGuard)
  @ApiOperation({ summary: "Fetch the authenticated user's own website" })
  @Header('Cache-Control', 'no-store')
  getMine(@Req() req: RequestWithWebsite) {
    return toOwnerView(req.website);
  }

  /**
   * The live snapshot consumed by the SSR renderer. Public — this is what
   * every visitor request to `<slug>.webvu.io` resolves to.
   *
   * Returns 404 for an unknown slug and for a website that exists but is not
   * publicly served, so the two are indistinguishable to a visitor. The
   * `X-Webvu-Reason` header tells the renderer which 404 page to show.
   */
  @Get(':slug')
  @ApiOperation({ summary: 'Fetch the live website snapshot for a slug' })
  @ApiParam({ name: 'slug', example: 'beardbaker' })
  @ApiOkResponse({ description: 'The live snapshot: theme, header, footer and pages' })
  @Header('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400')
  async findOne(@Param('slug') slug: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.websites.getLiveSnapshot(slug);

    if (!result.available) {
      res.setHeader('X-Webvu-Reason', result.reason);
      // Nothing about an unavailable website should be cached at the edge:
      // publishing must take effect immediately.
      res.setHeader('Cache-Control', 'no-store');
      throw new NotFoundException('Website not found');
    }

    return result.snapshot;
  }
}

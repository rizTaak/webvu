import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Website } from '../database/entities/website.entity';
import { WebsitesController } from './websites.controller';
import { WebsitesService } from './websites.service';
import { WebsiteOwnerGuard } from './website-owner.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Website]), AuthModule],
  controllers: [WebsitesController],
  providers: [WebsitesService, WebsiteOwnerGuard],
  exports: [WebsitesService, WebsiteOwnerGuard],
})
export class WebsitesModule {}

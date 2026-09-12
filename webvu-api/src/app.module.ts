import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env';
import { dataSourceOptions } from './database/data-source';
import { AuthModule } from './auth/auth.module';
import { WebsitesModule } from './websites/websites.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Fails fast on a bad configuration, including the dev-auth-stub guard.
      validate: validateEnv,
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    WebsitesModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

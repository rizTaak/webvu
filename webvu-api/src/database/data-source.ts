import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { OAuthAccount } from './entities/oauth-account.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from './entities/user.entity';
import { Website } from './entities/website.entity';

loadEnv();

/**
 * Shared TypeORM configuration, used by both the Nest module and the CLI.
 * `synchronize` is false in every environment — schema changes go through
 * migrations so a deploy can be rolled back without a schema rollback.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL ?? 'postgresql://webvu:webvu@localhost:5432/webvu',
  entities: [User, Website, OAuthAccount, RefreshToken],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
  logging: process.env.TYPEORM_LOGGING === 'true',
};

export default new DataSource(dataSourceOptions);

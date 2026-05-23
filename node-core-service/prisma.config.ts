import { defineConfig, env } from 'prisma/config';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '.env') });

export default defineConfig({
  schema: path.join(__dirname, '../database/prisma/schema.prisma'),
  datasource: {
    url: env('DATABASE_URL'),
  },
});

import { config } from 'dotenv';
config({ path: ['.env.local', '.env'] });
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: process.env.DATABASE_URL ?? '' },
});

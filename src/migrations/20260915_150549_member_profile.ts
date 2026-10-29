import { type MigrateUpArgs, sql } from '@payloadcms/db-sqlite';
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE blog_members ADD bio text;`);
  await db.run(sql`ALTER TABLE blog_members ADD avatar_id integer REFERENCES blog_private_media(id);`);
  await db.run(sql`CREATE INDEX blog_members_avatar_idx ON blog_members (avatar_id);`);
}
export async function down(): Promise<void> {
  throw new Error('Profile data must be preserved. Restore a reviewed backup instead of automatically dropping profile fields.');
}

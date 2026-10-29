import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE BlogPrivateMediaBlob (filename TEXT PRIMARY KEY, mime TEXT NOT NULL, data BLOB NOT NULL);`)
  await db.run(sql`CREATE TABLE \`blog_members_sessions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`created_at\` text,
  	\`expires_at\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`blog_members\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`blog_members_sessions_order_idx\` ON \`blog_members_sessions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`blog_members_sessions_parent_id_idx\` ON \`blog_members_sessions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`blog_members\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`email\` text,
  	\`username\` text NOT NULL,
  	\`reset_password_token\` text,
  	\`reset_password_expiration\` text,
  	\`salt\` text,
  	\`hash\` text,
  	\`login_attempts\` numeric DEFAULT 0,
  	\`lock_until\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`blog_members_updated_at_idx\` ON \`blog_members\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`blog_members_created_at_idx\` ON \`blog_members\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`blog_members_username_idx\` ON \`blog_members\` (\`username\`);`)
  await db.run(sql`CREATE TABLE \`blog_private_notes\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`owner_id\` integer NOT NULL,
  	\`title\` text NOT NULL,
  	\`content\` text NOT NULL,
  	\`cover_id\` integer,
  	\`category\` text DEFAULT '生活随笔',
  	\`excerpt\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`owner_id\`) REFERENCES \`blog_members\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`cover_id\`) REFERENCES \`blog_private_media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`blog_private_notes_owner_idx\` ON \`blog_private_notes\` (\`owner_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_private_notes_cover_idx\` ON \`blog_private_notes\` (\`cover_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_private_notes_updated_at_idx\` ON \`blog_private_notes\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`blog_private_notes_created_at_idx\` ON \`blog_private_notes\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`blog_private_notes_texts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`text\` text,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`blog_private_notes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`blog_private_notes_texts_order_parent\` ON \`blog_private_notes_texts\` (\`order\`,\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`blog_private_media\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`owner_id\` integer NOT NULL,
  	\`alt\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`url\` text,
  	\`thumbnail_u_r_l\` text,
  	\`filename\` text,
  	\`mime_type\` text,
  	\`filesize\` numeric,
  	\`width\` numeric,
  	\`height\` numeric,
  	\`focal_x\` numeric,
  	\`focal_y\` numeric,
  	FOREIGN KEY (\`owner_id\`) REFERENCES \`blog_members\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`blog_private_media_owner_idx\` ON \`blog_private_media\` (\`owner_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_private_media_updated_at_idx\` ON \`blog_private_media\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`blog_private_media_created_at_idx\` ON \`blog_private_media\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`blog_private_media_filename_idx\` ON \`blog_private_media\` (\`filename\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`blog_members_id\` integer REFERENCES blog_members(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`blog_private_notes_id\` integer REFERENCES blog_private_notes(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`blog_private_media_id\` integer REFERENCES blog_private_media(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_blog_members_id_idx\` ON \`payload_locked_documents_rels\` (\`blog_members_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_blog_private_notes_id_idx\` ON \`payload_locked_documents_rels\` (\`blog_private_notes_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_blog_private_media_id_idx\` ON \`payload_locked_documents_rels\` (\`blog_private_media_id\`);`)
  await db.run(sql`ALTER TABLE \`payload_preferences_rels\` ADD \`blog_members_id\` integer REFERENCES blog_members(id);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_blog_members_id_idx\` ON \`payload_preferences_rels\` (\`blog_members_id\`);`)
}

export async function down(_args: MigrateDownArgs): Promise<void> { throw new Error("Private notes migration requires a reviewed backup restore; automatic rollback would remove user data."); }



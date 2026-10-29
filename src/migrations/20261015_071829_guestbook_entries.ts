import { type MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`blog_guestbook\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`body\` text NOT NULL,
  	\`parent_id\` integer,
  	\`is_admin\` integer DEFAULT false,
  	\`status\` text DEFAULT 'pending' NOT NULL,
  	\`withdrawn_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`blog_guestbook\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`blog_guestbook_parent_idx\` ON \`blog_guestbook\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_guestbook_status_idx\` ON \`blog_guestbook\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`blog_guestbook_updated_at_idx\` ON \`blog_guestbook\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`blog_guestbook_created_at_idx\` ON \`blog_guestbook\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`blog_guestbook_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`blog_members_id\` integer,
  	\`blog_users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`blog_guestbook\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`blog_members_id\`) REFERENCES \`blog_members\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`blog_users_id\`) REFERENCES \`blog_users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`blog_guestbook_rels_order_idx\` ON \`blog_guestbook_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`blog_guestbook_rels_parent_idx\` ON \`blog_guestbook_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_guestbook_rels_path_idx\` ON \`blog_guestbook_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`blog_guestbook_rels_blog_members_id_idx\` ON \`blog_guestbook_rels\` (\`blog_members_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_guestbook_rels_blog_users_id_idx\` ON \`blog_guestbook_rels\` (\`blog_users_id\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`blog_guestbook_id\` integer REFERENCES blog_guestbook(id) ON UPDATE no action ON DELETE cascade;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_blog_guestbook_id_idx\` ON \`payload_locked_documents_rels\` (\`blog_guestbook_id\`);`)
  // These additive guards close moderation/withdrawal races even when a stale
  // admin request passed its application hook before another transaction won.
  await db.run(sql`CREATE TRIGGER blog_guestbook_no_restore BEFORE UPDATE OF status ON blog_guestbook
    WHEN OLD.status = 'withdrawn' AND NEW.status != 'withdrawn'
    BEGIN SELECT RAISE(ABORT, 'guestbook_withdrawn'); END;`)
  await db.run(sql`CREATE TRIGGER blog_guestbook_parent_insert BEFORE INSERT ON blog_guestbook
    WHEN NEW.parent_id IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM blog_guestbook WHERE id = NEW.parent_id AND parent_id IS NULL AND status = 'approved')
    BEGIN SELECT RAISE(ABORT, 'guestbook_parent'); END;`)
  await db.run(sql`CREATE TRIGGER blog_guestbook_parent_update BEFORE UPDATE OF parent_id, status ON blog_guestbook
    WHEN NEW.parent_id IS NOT NULL AND (NEW.status = 'approved' OR NEW.parent_id IS NOT OLD.parent_id) AND NOT EXISTS
      (SELECT 1 FROM blog_guestbook WHERE id = NEW.parent_id AND parent_id IS NULL AND status = 'approved')
    BEGIN SELECT RAISE(ABORT, 'guestbook_parent'); END;`)
}

export async function down(): Promise<void> {
  throw new Error('Guestbook messages must be preserved. Restore a reviewed backup instead of automatically dropping them.');
}

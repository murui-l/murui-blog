import * as migration_20260913_062121_initial_blog from './20260913_062121_initial_blog';
import * as migration_20260915_073320_private_member_notes from './20260915_073320_private_member_notes';
import * as migration_20260915_150549_member_profile from './20260915_150549_member_profile';
import * as migration_20261015_071829_guestbook_entries from './20261015_071829_guestbook_entries';

export const migrations = [
  {
    up: migration_20260913_062121_initial_blog.up,
    down: migration_20260913_062121_initial_blog.down,
    name: '20260913_062121_initial_blog',
  },
  {
    up: migration_20260915_073320_private_member_notes.up,
    down: migration_20260915_073320_private_member_notes.down,
    name: '20260915_073320_private_member_notes',
  },
  {
    up: migration_20260915_150549_member_profile.up,
    down: migration_20260915_150549_member_profile.down,
    name: '20260915_150549_member_profile',
  },
  {
    up: migration_20261015_071829_guestbook_entries.up,
    down: migration_20261015_071829_guestbook_entries.down,
    name: '20261015_071829_guestbook_entries'
  },
];

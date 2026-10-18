import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const games=sqliteTable('games',{id:text('id').primaryKey(),owner:text('owner').notNull(),state:text('state').notNull(),version:integer('version').notNull().default(0)});
export const members=sqliteTable('members',{id:text('id').primaryKey(),game:text('game').notNull(),user:text('user').notNull(),team:text('team').notNull(),location:text('location'),updated:integer('updated').notNull().default(0)},t=>[index('idx_members_game').on(t.game),index('idx_members_user').on(t.user)]);

export const pushSubscriptions=sqliteTable('push_subscriptions',{endpoint:text('endpoint').primaryKey(),game:text('game').notNull(),user:text('user').notNull(),subscription:text('subscription').notNull()},t=>[index('idx_push_game').on(t.game)]);

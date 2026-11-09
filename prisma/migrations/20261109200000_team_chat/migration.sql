-- Chat entre colaboradores: conversaciones directas y grupos.
CREATE TABLE "team_chats" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "name" TEXT,
  "direct_key" TEXT,
  "created_by_id" TEXT,
  "last_message_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "team_chats_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "team_chats_direct_key_key" ON "team_chats"("direct_key");
ALTER TABLE "team_chats" ADD CONSTRAINT "team_chats_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "team_chat_members" (
  "chat_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "last_read_at" TIMESTAMP(3),
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "team_chat_members_pkey" PRIMARY KEY ("chat_id", "user_id")
);
CREATE INDEX "team_chat_members_user_id_idx" ON "team_chat_members"("user_id");
ALTER TABLE "team_chat_members" ADD CONSTRAINT "team_chat_members_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "team_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_chat_members" ADD CONSTRAINT "team_chat_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "team_chat_messages" (
  "id" TEXT NOT NULL,
  "chat_id" TEXT NOT NULL,
  "sender_id" TEXT,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "team_chat_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "team_chat_messages_chat_id_created_at_idx" ON "team_chat_messages"("chat_id", "created_at");
ALTER TABLE "team_chat_messages" ADD CONSTRAINT "team_chat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "team_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_chat_messages" ADD CONSTRAINT "team_chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

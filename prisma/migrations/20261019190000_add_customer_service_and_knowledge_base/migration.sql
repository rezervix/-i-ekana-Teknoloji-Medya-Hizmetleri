-- Migration: Add Customer Service Chat, Handovers and Knowledge Base tables and Enums

-- 1. Create Enums safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChatConversationStatus') THEN
        CREATE TYPE "ChatConversationStatus" AS ENUM ('ACTIVE', 'HANDED_OVER', 'CLOSED', 'RESOLVED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChatSenderType') THEN
        CREATE TYPE "ChatSenderType" AS ENUM ('VISITOR', 'BOT', 'AGENT', 'SYSTEM');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChatHandoverStatus') THEN
        CREATE TYPE "ChatHandoverStatus" AS ENUM ('NONE', 'REQUESTED', 'PENDING_CONTACT', 'CONTACTED', 'RESOLVED', 'CANCELLED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HandoverStatus') THEN
        CREATE TYPE "HandoverStatus" AS ENUM ('NEW', 'IN_REVIEW', 'CONTACTED', 'RESOLVED', 'CLOSED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'KnowledgeDocStatus') THEN
        CREATE TYPE "KnowledgeDocStatus" AS ENUM ('DRAFT', 'PROCESSING', 'ACTIVE', 'DISABLED', 'ERROR');
    END IF;
END $$;

-- 2. Create Table chat_conversations
CREATE TABLE IF NOT EXISTS "chat_conversations" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT,
    "title" TEXT,
    "page_url" TEXT,
    "product_id" TEXT,
    "status" "ChatConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "customer_name" TEXT,
    "customer_phone" TEXT,
    "customer_email" TEXT,
    "handover_status" "ChatHandoverStatus" NOT NULL DEFAULT 'NONE',
    "handover_reason" TEXT,
    "assigned_to" TEXT,
    "internal_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- 3. Create Table chat_messages
CREATE TABLE IF NOT EXISTS "chat_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_type" "ChatSenderType" NOT NULL DEFAULT 'VISITOR',
    "sender_name" TEXT,
    "content" TEXT NOT NULL,
    "is_delivered" BOOLEAN NOT NULL DEFAULT true,
    "tokens_used" INTEGER,
    "suggested_products" JSONB,
    "used_document_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "evidence_confidence" DOUBLE PRECISION,
    "is_handover_prompt" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- 4. Create Table chat_handovers
CREATE TABLE IF NOT EXISTS "chat_handovers" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "customer_name" TEXT,
    "customer_phone" TEXT NOT NULL,
    "customer_email" TEXT,
    "related_product" TEXT,
    "unanswered_question" TEXT NOT NULL,
    "conversation_summary" TEXT,
    "handover_reason" TEXT NOT NULL,
    "status" "HandoverStatus" NOT NULL DEFAULT 'NEW',
    "assigned_agent" TEXT,
    "agent_notes" TEXT,
    "contacted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_handovers_pkey" PRIMARY KEY ("id")
);

-- 5. Create Table knowledge_documents
CREATE TABLE IF NOT EXISTS "knowledge_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "raw_content" TEXT NOT NULL,
    "clean_content" TEXT NOT NULL,
    "product_id" TEXT,
    "product_type" TEXT,
    "category" TEXT,
    "status" "KnowledgeDocStatus" NOT NULL DEFAULT 'DRAFT',
    "status_message" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploaded_by" TEXT,
    "chunk_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- 6. Create Table knowledge_chunks
CREATE TABLE IF NOT EXISTS "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "tokens" INTEGER,
    "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- 7. Add Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chat_conversations_user_id_fkey') THEN
        ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chat_messages_conversation_id_fkey') THEN
        ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chat_handovers_conversation_id_fkey') THEN
        ALTER TABLE "chat_handovers" ADD CONSTRAINT "chat_handovers_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'knowledge_chunks_document_id_fkey') THEN
        ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 8. Add Indexes
CREATE INDEX IF NOT EXISTS "chat_conversations_session_id_idx" ON "chat_conversations"("session_id");
CREATE INDEX IF NOT EXISTS "chat_conversations_status_idx" ON "chat_conversations"("status");
CREATE INDEX IF NOT EXISTS "chat_conversations_handover_status_idx" ON "chat_conversations"("handover_status");
CREATE INDEX IF NOT EXISTS "chat_conversations_created_at_idx" ON "chat_conversations"("created_at");

CREATE INDEX IF NOT EXISTS "chat_messages_conversation_id_idx" ON "chat_messages"("conversation_id");
CREATE INDEX IF NOT EXISTS "chat_messages_sender_type_idx" ON "chat_messages"("sender_type");
CREATE INDEX IF NOT EXISTS "chat_messages_created_at_idx" ON "chat_messages"("created_at");

CREATE INDEX IF NOT EXISTS "chat_handovers_status_idx" ON "chat_handovers"("status");
CREATE INDEX IF NOT EXISTS "chat_handovers_customer_phone_idx" ON "chat_handovers"("customer_phone");
CREATE INDEX IF NOT EXISTS "chat_handovers_created_at_idx" ON "chat_handovers"("created_at");

CREATE INDEX IF NOT EXISTS "knowledge_documents_status_idx" ON "knowledge_documents"("status");
CREATE INDEX IF NOT EXISTS "knowledge_documents_product_id_idx" ON "knowledge_documents"("product_id");
CREATE INDEX IF NOT EXISTS "knowledge_documents_category_idx" ON "knowledge_documents"("category");

CREATE INDEX IF NOT EXISTS "knowledge_chunks_document_id_idx" ON "knowledge_chunks"("document_id");

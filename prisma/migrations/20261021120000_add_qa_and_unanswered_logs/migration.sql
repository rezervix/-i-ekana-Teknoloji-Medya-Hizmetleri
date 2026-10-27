-- Migration: Add KnowledgeQA and UnansweredQuestionLog tables

CREATE TABLE IF NOT EXISTS "knowledge_qas" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Genel',
    "product_id" TEXT,
    "variations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_qas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "knowledge_qas_category_idx" ON "knowledge_qas"("category");
CREATE INDEX IF NOT EXISTS "knowledge_qas_product_id_idx" ON "knowledge_qas"("product_id");
CREATE INDEX IF NOT EXISTS "knowledge_qas_is_active_idx" ON "knowledge_qas"("is_active");

CREATE TABLE IF NOT EXISTS "unanswered_question_logs" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "conversation_id" TEXT,
    "matched_score" DOUBLE PRECISION,
    "candidate_doc_id" TEXT,
    "confidence" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "admin_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unanswered_question_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "unanswered_question_logs_status_idx" ON "unanswered_question_logs"("status");
CREATE INDEX IF NOT EXISTS "unanswered_question_logs_created_at_idx" ON "unanswered_question_logs"("created_at");

-- Migration: Add KnowledgeTestEvaluation table
CREATE TABLE IF NOT EXISTS "knowledge_test_evaluations" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "normalized_query" TEXT,
    "detected_intent" TEXT,
    "answer" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "admin_notes" TEXT,
    "confidence" DOUBLE PRECISION,
    "confidence_level" TEXT,
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_test_evaluations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "knowledge_test_evaluations_verdict_idx" ON "knowledge_test_evaluations"("verdict");
CREATE INDEX IF NOT EXISTS "knowledge_test_evaluations_created_at_idx" ON "knowledge_test_evaluations"("created_at");

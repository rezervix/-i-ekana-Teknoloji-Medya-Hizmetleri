import { prisma } from "@/lib/prisma";

export const CART_RECOVERY_RATE_SQL = `
WITH cart_summary AS (
  SELECT
    COUNT(*)::int AS total_abandoned,
    COUNT(*) FILTER (WHERE "allowMarketing" = true AND "unsubscribed" = false)::int AS marketing_eligible,
    COUNT(*) FILTER (WHERE "reminderCount" > 0)::int AS reminded_count,
    COUNT(*) FILTER (WHERE "reminderCount" = 1)::int AS reminded_stage_1,
    COUNT(*) FILTER (WHERE "reminderCount" >= 2)::int AS reminded_stage_2,
    COUNT(*) FILTER (WHERE "converted" = true)::int AS total_recovered,
    COUNT(*) FILTER (WHERE "converted" = true AND "reminderCount" > 0)::int AS recovered_via_campaign,
    COUNT(*) FILTER (WHERE "converted" = true AND "reminderCount" = 0)::int AS recovered_organic,
    COUNT(*) FILTER (WHERE "unsubscribed" = true)::int AS unsubscribed_count,
    COALESCE(SUM(
      CASE 
        WHEN ("cartSnapshot"->>'totalAmount') IS NOT NULL 
        THEN ("cartSnapshot"->>'totalAmount')::numeric 
        ELSE 0 
      END
    ), 0) AS total_abandoned_value,
    COALESCE(SUM(
      CASE 
        WHEN "converted" = true AND ("cartSnapshot"->>'totalAmount') IS NOT NULL 
        THEN ("cartSnapshot"->>'totalAmount')::numeric 
        ELSE 0 
      END
    ), 0) AS total_recovered_value
  FROM "CartAbandonmentLog"
)
SELECT
  total_abandoned,
  marketing_eligible,
  reminded_count,
  reminded_stage_1,
  reminded_stage_2,
  total_recovered,
  recovered_via_campaign,
  recovered_organic,
  unsubscribed_count,
  total_abandoned_value,
  total_recovered_value,
  ROUND(
    CASE 
      WHEN total_abandoned > 0 
      THEN (total_recovered::numeric / total_abandoned::numeric) * 100 
      ELSE 0 
    END, 2
  ) AS overall_recovery_rate_percent,
  ROUND(
    CASE 
      WHEN reminded_count > 0 
      THEN (recovered_via_campaign::numeric / reminded_count::numeric) * 100 
      ELSE 0 
    END, 2
  ) AS campaign_recovery_rate_percent
FROM cart_summary;
`;

export interface CartRecoveryStats {
  total_abandoned: number;
  marketing_eligible: number;
  reminded_count: number;
  reminded_stage_1: number;
  reminded_stage_2: number;
  total_recovered: number;
  recovered_via_campaign: number;
  recovered_organic: number;
  unsubscribed_count: number;
  total_abandoned_value: number;
  total_recovered_value: number;
  overall_recovery_rate_percent: number;
  campaign_recovery_rate_percent: number;
}

export async function getCartRecoveryStats(): Promise<CartRecoveryStats> {
  const result: any[] = await prisma.$queryRawUnsafe(CART_RECOVERY_RATE_SQL);
  const row = result?.[0] || {};

  return {
    total_abandoned: Number(row.total_abandoned || 0),
    marketing_eligible: Number(row.marketing_eligible || 0),
    reminded_count: Number(row.reminded_count || 0),
    reminded_stage_1: Number(row.reminded_stage_1 || 0),
    reminded_stage_2: Number(row.reminded_stage_2 || 0),
    total_recovered: Number(row.total_recovered || 0),
    recovered_via_campaign: Number(row.recovered_via_campaign || 0),
    recovered_organic: Number(row.recovered_organic || 0),
    unsubscribed_count: Number(row.unsubscribed_count || 0),
    total_abandoned_value: Number(row.total_abandoned_value || 0),
    total_recovered_value: Number(row.total_recovered_value || 0),
    overall_recovery_rate_percent: Number(row.overall_recovery_rate_percent || 0),
    campaign_recovery_rate_percent: Number(row.campaign_recovery_rate_percent || 0),
  };
}

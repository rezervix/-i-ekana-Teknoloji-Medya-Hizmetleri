export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkCustomerServiceAdminAuth, unauthorizedResponse } from '@/lib/ai/admin-auth';

export async function GET(req: NextRequest) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  const nonEmptyWhere: any = {
    OR: [
      { messages: { some: { senderType: { in: ['VISITOR', 'AGENT'] as any } } } },
      { handovers: { some: {} } },
      { customerPhone: { not: null } },
      { customerEmail: { not: null } },
    ],
  };

  try {
    const [
      totalConversations,
      totalMessages,
      totalHandovers,
      handoversWithPhone,
      activeConversations,
      resolvedConversations,
      recentHandovers,
      recentConversations,
    ] = await Promise.all([
      prisma.chatConversation.count({ where: nonEmptyWhere }),
      prisma.chatMessage.count(),
      prisma.chatHandover.count(),
      prisma.chatHandover.count({
        where: {
          OR: [{ customerPhone: { not: '' } }, { customerEmail: { not: null } }],
        },
      }),
      prisma.chatConversation.count({
        where: { AND: [nonEmptyWhere, { status: 'ACTIVE' }] },
      }),
      prisma.chatConversation.count({
        where: { AND: [nonEmptyWhere, { status: 'RESOLVED' }] },
      }),
      // Unanswered questions from handovers (knowledge gaps)
      prisma.chatHandover.findMany({
        select: {
          id: true,
          unansweredQuestion: true,
          relatedProduct: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
      // Daily conversations last 7 days
      prisma.chatConversation.findMany({
        where: {
          AND: [
            nonEmptyWhere,
            {
              createdAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              },
            },
          ],
        },
        select: {
          id: true,
          createdAt: true,
          productId: true,
          status: true,
          handoverStatus: true,
        },
      }),
    ]);

    // Group conversations by day
    const dailyMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, 0);
    }

    for (const c of recentConversations) {
      const key = c.createdAt.toISOString().slice(0, 10);
      if (dailyMap.has(key)) {
        dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
      }
    }

    const dailyTrend = Array.from(dailyMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // Calculate handover status breakdown
    const handoverStatusCounts = await prisma.chatHandover.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalConversations,
        totalMessages,
        totalHandovers,
        handoversWithPhone,
        activeConversations,
        resolvedConversations,
        resolutionRate:
          totalConversations > 0
            ? Math.round((resolvedConversations / totalConversations) * 100)
            : 0,
        handoverRate:
          totalConversations > 0 ? Math.round((totalHandovers / totalConversations) * 100) : 0,
      },
      dailyTrend,
      handoverStatusBreakdown: handoverStatusCounts.map((h) => ({
        status: h.status,
        count: h._count.id,
      })),
      unansweredQuestions: recentHandovers.map((h) => ({
        id: h.id,
        question: h.unansweredQuestion,
        relatedProduct: h.relatedProduct,
        status: h.status,
        createdAt: h.createdAt,
      })),
    });
  } catch (err: any) {
    console.error('[AdminCustomerServiceAnalyticsAPI] Error:', err);
    return NextResponse.json(
      { error: 'Analitik verileri hesaplanırken bir hata oluştu.' },
      { status: 500 }
    );
  }
}

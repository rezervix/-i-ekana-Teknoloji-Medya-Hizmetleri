import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const subId = searchParams.get('subId');
  const token = searchParams.get('token');

  if (!subId || typeof subId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(subId)) {
    return NextResponse.json(
      { valid: false, message: 'Geçersiz veya eksik abonelik referansı.' },
      { status: 400 }
    );
  }

  try {
    const session = await auth().catch(() => null);
    const sessionUserId = (session?.user as any)?.id;

    const subscription = await prisma.subscription.findUnique({
      where: { id: subId },
      include: {
        plan: true,
        planTier: true,
        user: true,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { valid: false, message: 'Abonelik kaydı bulunamadı.' },
        { status: 404 }
      );
    }

    if (subscription.status === 'FAILED') {
      return NextResponse.json(
        { valid: false, failed: true, message: 'Ödeme işlemi başarısız oldu veya iptal edildi.' },
        { status: 400 }
      );
    }

    if (subscription.status === 'PENDING') {
      return NextResponse.json({
        valid: true,
        pending: true,
        message: 'Ödemeniz PayTR tarafından onaylanıyor, lütfen bekleyiniz...',
      });
    }

    if (subscription.status !== 'ACTIVE') {
      return NextResponse.json(
        { valid: false, message: 'Bu abonelik aktif durumda değil.' },
        { status: 400 }
      );
    }

    // Güvenlik doğrulaması: Rastgele elle yazılan URL'lerin başarı görmesini engelle
    const hasValidToken = Boolean(
      token &&
        subscription.claimToken &&
        token === subscription.claimToken &&
        subscription.claimTokenExpiresAt &&
        subscription.claimTokenExpiresAt > new Date()
    );

    const isOwnedBySession = Boolean(sessionUserId && subscription.userId === sessionUserId);
    const isAlreadyLinkedUser = Boolean(sessionUserId && subscription.user?.id === sessionUserId);

    if (!hasValidToken && !isOwnedBySession && !isAlreadyLinkedUser) {
      // Token kullanılmış olsa bile aynı browser oturumunda doğrulanabilmesi için
      // veya henüz giriş yapmamışsa token zorunludur
      return NextResponse.json(
        {
          valid: false,
          unauthorized: true,
          message: 'Bu abonelik için geçerli bir oturum veya doğrulama anahtarı bulunamadı.',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      valid: true,
      success: true,
      subId: subscription.id,
      planName: subscription.plan.name,
      planSlug: subscription.plan.slug,
      tierName: subscription.planTier?.name || 'Standart',
      priceMonthly: subscription.priceAtPurchase,
      userPhone: subscription.user?.phone || subscription.pendingPhone || '',
      userName: subscription.user?.name || subscription.pendingName || 'Müşteri',
      userEmail: subscription.user?.email || subscription.pendingEmail || '',
      claimToken: subscription.claimToken || null,
      contactPhone: '+90 530 341 21 56',
      portalUrl: '/profile/subscriptions',
      nextSteps: [
        'Aboneliğiniz başarıyla başlatıldı ve sistemimize kaydedildi.',
        'Müşteri temsilcimiz kurulum ve entegrasyon süreci için sizinle iletişime geçecektir.',
        'Abonelik durumunuzu ve kullanım detaylarınızı profilinizden dilediğiniz zaman yönetebilirsiniz.',
      ],
    });
  } catch (error) {
    console.error('Verify success error:', error);
    return NextResponse.json(
      { valid: false, message: 'Doğrulama işlemi sırasında hata oluştu.' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  normalizePhoneNumber,
  isValidTurkishPhone,
  checkPhoneCheckRateLimit,
} from '@/lib/auth-security';

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  const rateLimitResult = checkPhoneCheckRateLimit(ip);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Çok fazla sorgulama yaptınız. Lütfen kısa bir süre sonra tekrar deneyin.',
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const rawPhone = typeof body.phone === 'string' ? body.phone : '';
    const normalized = normalizePhoneNumber(rawPhone);

    if (!isValidTurkishPhone(normalized)) {
      return NextResponse.json({ success: true, exists: false, valid: false });
    }

    const user = await prisma.user.findFirst({
      where: { phone: normalized },
      select: { id: true },
    });

    return NextResponse.json({
      success: true,
      exists: Boolean(user),
      valid: true,
    });
  } catch (error) {
    console.error('Phone check error:', error);
    return NextResponse.json({ success: false, error: 'Sorgulama yapılamadı.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

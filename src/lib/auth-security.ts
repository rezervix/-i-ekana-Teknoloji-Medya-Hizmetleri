import { checkRateLimit } from '@/lib/rateLimit';

export const COMMON_PASSWORDS = new Set([
  '12345678',
  'password',
  '123456789',
  '11111111',
  '1234567890',
  'qwerty123',
  'admin123',
  '12341234',
  '00000000',
  'istanbul',
  'turkiye123',
  'cicekana123',
  'password1',
  'letmein1',
  'welcome1',
]);

/**
 * Normalizes any Turkish phone number format into standard 11-digit `05XXXXXXXXX`
 * Examples:
 * +90 530 341 21 56 -> 05303412156
 * 905303412156      -> 05303412156
 * 5303412156        -> 05303412156
 * 05303412156       -> 05303412156
 */
export function normalizePhoneNumber(raw: string | null | undefined): string {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length === 12) {
    digits = digits.slice(2);
  }
  if (digits.length === 10 && digits.startsWith('5')) {
    return `0${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('05')) {
    return digits;
  }
  return digits;
}

export function isValidTurkishPhone(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  return /^05\d{9}$/.test(normalized);
}

export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Şifre zorunludur.' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Şifreniz en az 8 karakterden oluşmalıdır.' };
  }
  const lower = password.toLowerCase().trim();
  if (COMMON_PASSWORDS.has(lower)) {
    return {
      valid: false,
      error: 'Bu şifre çok yaygın ve tahmin edilmesi kolaydır. Lütfen daha güçlü bir şifre belirleyin.',
    };
  }
  return { valid: true };
}

export function checkLoginRateLimit(ip: string, identifier: string) {
  const ipResult = checkRateLimit(`auth:login:ip:${ip}`, 10, 15 * 60 * 1000);
  if (!ipResult.success) return ipResult;
  const idResult = checkRateLimit(`auth:login:id:${identifier.toLowerCase().trim()}`, 5, 15 * 60 * 1000);
  return idResult;
}

export function checkPhoneCheckRateLimit(ip: string) {
  return checkRateLimit(`auth:check-phone:ip:${ip}`, 30, 5 * 60 * 1000);
}

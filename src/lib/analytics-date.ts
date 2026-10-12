/**
 * Analytics Tarih & Saat Dilimi Yardımcısı (Europe/Istanbul UTC+3 Uyumlu)
 */

export type DatePreset = 
  | 'today' 
  | 'yesterday' 
  | 'last_7_days' 
  | 'last_30_days' 
  | 'this_month' 
  | 'last_month' 
  | 'custom';

export interface DateRangeResult {
  preset: DatePreset;
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  isSingleDay: boolean;
  label: string;
  prevLabel: string;
}

// Türkiye saat dilimi farkı (UTC+3 sabit)
const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Verilen UTC Date'i Türkiye yerel takvim gününe dönüştürür (YYYY-MM-DD)
 */
export function getIstanbulDateString(d: Date = new Date()): string {
  const trTime = new Date(d.getTime() + ISTANBUL_OFFSET_MS);
  return trTime.toISOString().split('T')[0];
}

/**
 * Türkiye takvimindeki 'YYYY-MM-DD' gününün başlangıcını (00:00:00.000 Istanbul = 21:00:00.000 UTC önceki gün) Date objesi olarak döndürür
 */
export function getIstanbulDayStart(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  // UTC zamanında Istanbul 00:00:00 oluşturmak için:
  const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  // 3 saat geriye çekerek gerçek UTC Date elde ediyoruz
  return new Date(utcDate.getTime() - ISTANBUL_OFFSET_MS);
}

/**
 * Türkiye takvimindeki 'YYYY-MM-DD' gününün bitişini (23:59:59.999 Istanbul) Date objesi olarak döndürür
 */
export function getIstanbulDayEnd(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  return new Date(utcDate.getTime() - ISTANBUL_OFFSET_MS);
}

/**
 * Preset ve opsiyonel parametrelere göre Europe/Istanbul sınırlarında tarih aralığı hesaplar
 */
export function resolveDateRange(
  preset: string = 'last_30_days',
  customStartStr?: string | null,
  customEndStr?: string | null
): DateRangeResult {
  const now = new Date();
  const todayStr = getIstanbulDateString(now);

  const [tY, tM, tD] = todayStr.split('-').map(Number);
  const todayStart = getIstanbulDayStart(todayStr);
  const todayEnd = getIstanbulDayEnd(todayStr);

  let start: Date;
  let end: Date;
  let prevStart: Date;
  let prevEnd: Date;
  let isSingleDay = false;
  let label = 'Son 30 Gün';
  let prevLabel = 'Önceki 30 Gün';
  let cleanPreset: DatePreset = 'last_30_days';

  switch (preset) {
    case 'today': {
      cleanPreset = 'today';
      start = todayStart;
      end = now < todayEnd ? now : todayEnd;
      isSingleDay = true;
      label = 'Bugün';

      // Önceki dönem: Dün
      const yesterdayDate = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayStr = getIstanbulDateString(yesterdayDate);
      prevStart = getIstanbulDayStart(yesterdayStr);
      prevEnd = getIstanbulDayEnd(yesterdayStr);
      prevLabel = 'Dün';
      break;
    }

    case 'yesterday': {
      cleanPreset = 'yesterday';
      const yesterdayDate = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayStr = getIstanbulDateString(yesterdayDate);
      start = getIstanbulDayStart(yesterdayStr);
      end = getIstanbulDayEnd(yesterdayStr);
      isSingleDay = true;
      label = 'Dün';

      // Önceki dönem: Dünden önceki gün
      const prevPrevDate = new Date(start.getTime() - 24 * 60 * 60 * 1000);
      const prevPrevStr = getIstanbulDateString(prevPrevDate);
      prevStart = getIstanbulDayStart(prevPrevStr);
      prevEnd = getIstanbulDayEnd(prevPrevStr);
      prevLabel = 'Önceki Gün';
      break;
    }

    case 'last_7_days': {
      cleanPreset = 'last_7_days';
      const startDay = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
      const startStr = getIstanbulDateString(startDay);
      start = getIstanbulDayStart(startStr);
      end = now < todayEnd ? now : todayEnd;
      isSingleDay = false;
      label = 'Son 7 Gün';

      // Önceki dönem: ondan önceki 7 gün
      const pStartDay = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
      const pStartStr = getIstanbulDateString(pStartDay);
      const pEndDay = new Date(start.getTime() - 1);
      prevStart = getIstanbulDayStart(pStartStr);
      prevEnd = pEndDay;
      prevLabel = 'Önceki 7 Gün';
      break;
    }

    case 'this_month': {
      cleanPreset = 'this_month';
      const monthStartStr = `${tY}-${String(tM).padStart(2, '0')}-01`;
      start = getIstanbulDayStart(monthStartStr);
      end = now < todayEnd ? now : todayEnd;
      isSingleDay = false;
      label = 'Bu Ay';

      // Önceki dönem: Geçen ayın aynı gününe kadarki kısmı
      const prevMonth = tM === 1 ? 12 : tM - 1;
      const prevYear = tM === 1 ? tY - 1 : tY;
      const prevMonthStartStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
      prevStart = getIstanbulDayStart(prevMonthStartStr);

      const daysInPrevMonth = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
      const targetPrevDay = Math.min(tD, daysInPrevMonth);
      const prevMonthEndStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(targetPrevDay).padStart(2, '0')}`;
      prevEnd = getIstanbulDayEnd(prevMonthEndStr);
      prevLabel = 'Geçen Ay (Aynı Dönem)';
      break;
    }

    case 'last_month': {
      cleanPreset = 'last_month';
      const prevMonth = tM === 1 ? 12 : tM - 1;
      const prevYear = tM === 1 ? tY - 1 : tY;
      const daysInPrevMonth = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
      
      const startStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
      const endStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(daysInPrevMonth).padStart(2, '0')}`;
      start = getIstanbulDayStart(startStr);
      end = getIstanbulDayEnd(endStr);
      isSingleDay = false;
      label = 'Geçen Ay';

      // Önceki dönem: 2 ay önceki ay
      const twoMonthsAgo = prevMonth === 1 ? 12 : prevMonth - 1;
      const twoMonthsAgoYear = prevMonth === 1 ? prevYear - 1 : prevYear;
      const daysInTwoMonthsAgo = new Date(Date.UTC(twoMonthsAgoYear, twoMonthsAgo, 0)).getUTCDate();
      const pStartStr = `${twoMonthsAgoYear}-${String(twoMonthsAgo).padStart(2, '0')}-01`;
      const pEndStr = `${twoMonthsAgoYear}-${String(twoMonthsAgo).padStart(2, '0')}-${String(daysInTwoMonthsAgo).padStart(2, '0')}`;
      prevStart = getIstanbulDayStart(pStartStr);
      prevEnd = getIstanbulDayEnd(pEndStr);
      prevLabel = 'Önceki Ay';
      break;
    }

    case 'custom': {
      cleanPreset = 'custom';
      const sStr = customStartStr || todayStr;
      const eStr = customEndStr || sStr;
      start = getIstanbulDayStart(sStr);
      end = getIstanbulDayEnd(eStr);
      isSingleDay = sStr === eStr;
      label = isSingleDay ? sStr : `${sStr} - ${eStr}`;

      const durationMs = end.getTime() - start.getTime();
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - durationMs);
      prevLabel = 'Önceki Dönem';
      break;
    }

    case 'last_30_days':
    default: {
      cleanPreset = 'last_30_days';
      const startDay = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000);
      const startStr = getIstanbulDateString(startDay);
      start = getIstanbulDayStart(startStr);
      end = now < todayEnd ? now : todayEnd;
      isSingleDay = false;
      label = 'Son 30 Gün';

      const pStartDay = new Date(start.getTime() - 30 * 24 * 60 * 60 * 1000);
      const pStartStr = getIstanbulDateString(pStartDay);
      const pEndDay = new Date(start.getTime() - 1);
      prevStart = getIstanbulDayStart(pStartStr);
      prevEnd = pEndDay;
      prevLabel = 'Önceki 30 Gün';
      break;
    }
  }

  return {
    preset: cleanPreset,
    start,
    end,
    prevStart,
    prevEnd,
    isSingleDay,
    label,
    prevLabel,
  };
}

/**
 * Yüzdelik değişim hesaplar (+%12, -%8 gibi)
 */
export function calculatePercentageChange(current: number, previous: number): {
  percent: number;
  direction: 'up' | 'down' | 'neutral';
  formatted: string;
} {
  if (previous === 0) {
    if (current === 0) return { percent: 0, direction: 'neutral', formatted: '%0' };
    return { percent: 100, direction: 'up', formatted: '↑ %100' };
  }
  const diff = current - previous;
  const pct = Number(((diff / previous) * 100).toFixed(1));
  if (pct > 0) return { percent: pct, direction: 'up', formatted: `↑ %${pct}` };
  if (pct < 0) return { percent: Math.abs(pct), direction: 'down', formatted: `↓ %${Math.abs(pct)}` };
  return { percent: 0, direction: 'neutral', formatted: '%0' };
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { resolveDateRange } from "@/lib/analytics-date";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(role || "")) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const preset = searchParams.get("range") || "last_30_days";
    const customStart = searchParams.get("start");
    const customEnd = searchParams.get("end");
    const includeTest = searchParams.get("includeTest") === "true";

    const range = resolveDateRange(preset, customStart, customEnd);
    const { start, end } = range;

    const testEmailFilter = includeTest
      ? {}
      : {
          NOT: [
            { guestEmail: { contains: "test@" } },
            { notes: { contains: "[TEST]" } },
          ],
        };

    const validOrderStatuses = ["DELIVERED", "CONFIRMED", "SHIPPED", "PROCESSING"];

    const [orders, revenueAggregate] = await Promise.all([
      prisma.order.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          ...testEmailFilter,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.aggregate({
        _sum: { finalAmount: true },
        where: {
          createdAt: { gte: start, lte: end },
          status: { in: validOrderStatuses as any },
          ...testEmailFilter,
        },
      }),
    ]);

    const totalRevenue = revenueAggregate._sum.finalAmount || 0;
    const confirmedCount = orders.filter((o) => validOrderStatuses.includes(o.status)).length;
    const cancelledCount = orders.filter((o) => o.status === "CANCELLED" || o.paymentStatus === "FAILED").length;
    const pendingCount = orders.filter((o) => o.status === "PENDING" && o.paymentStatus === "PENDING").length;

    // Excel UTF-8 BOM
    let csv = "\uFEFF";

    // 1. Özet Bölümü
    csv += "CICEKANA E-TICARET ANALITIK RAPORU\r\n";
    csv += `Rapor Aralığı;${range.label} (${start.toLocaleDateString("tr-TR")} - ${end.toLocaleDateString("tr-TR")})\r\n`;
    csv += `Rapor Olusturulma Tarihi;${new Date().toLocaleString("tr-TR")}\r\n`;
    csv += "\r\n";
    csv += "ÖZET GÖSTERGELER\r\n";
    csv += "Metrik;Değer;Açıklama\r\n";
    csv += `Toplam Onaylı Ciro;${totalRevenue.toLocaleString("tr-TR")} TL;Yalnızca ödemesi alınmış siparişler\r\n`;
    csv += `Toplam Sipariş Adedi;${orders.length};Tüm sipariş başvuruları\r\n`;
    csv += `Onaylı Sipariş Adedi;${confirmedCount};Ödemesi tamamlanan siparişler\r\n`;
    csv += `Bekleyen Sipariş Adedi;${pendingCount};Ödeme veya onay bekleyenler\r\n`;
    csv += `İptal / Başarısız Sipariş;${cancelledCount};Ödemeden vazgeçilen veya iptal edilenler\r\n`;
    csv += `Ortalama Sipariş Tutarı;${confirmedCount > 0 ? Math.round(totalRevenue / confirmedCount).toLocaleString("tr-TR") : "0"} TL;Onaylı sipariş başına ortalama sepet\r\n`;
    csv += "\r\n";

    // 2. Sipariş Detay Listesi
    csv += "SİPARİŞ DETAY LİSTESİ\r\n";
    csv += "Sipariş No;Tarih;Müşteri Adı;Müşteri Tipi;Tutar (TL);Durum;Ödeme Durumu;Ödeme Kanalı;Kaynak;Şehir\r\n";

    orders.forEach((o) => {
      const ship = o.shippingAddress as any;
      const city = ship?.city ? String(ship.city).replace(/;/g, " ") : "-";
      const customerName = (o.guestName || "Müşteri").replace(/;/g, " ");
      const source = (o.utmSource || o.referrer || "Doğrudan").replace(/;/g, " ");
      const dateStr = new Date(o.createdAt).toLocaleString("tr-TR");

      const statusTr =
        o.status === "DELIVERED"
          ? "Teslim Edildi"
          : o.status === "SHIPPED"
          ? "Kargoda"
          : o.status === "PROCESSING"
          ? "Hazırlanıyor"
          : o.status === "CONFIRMED"
          ? "Onaylandı"
          : o.status === "CANCELLED"
          ? "İptal Edildi"
          : "Beklemede";

      const paymentStatusTr =
        o.paymentStatus === "COMPLETED"
          ? "Ödendi"
          : o.paymentStatus === "FAILED"
          ? "Başarısız"
          : "Bekliyor";

      const paymentMethodTr =
        o.paymentMethod === "paytr" || o.paymentMethod === "cc"
          ? "Kredi Kartı"
          : o.paymentMethod === "bank_transfer"
          ? "Havale/EFT"
          : o.paymentMethod || "-";

      csv += `"${o.orderNumber}";"${dateStr}";"${customerName}";"${o.customerType === "CORPORATE" ? "Kurumsal" : "Bireysel"}";"${o.finalAmount}";"${statusTr}";"${paymentStatusTr}";"${paymentMethodTr}";"${source}";"${city}"\r\n`;
    });

    const filename = `cicekana-analitik-${range.preset}-${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

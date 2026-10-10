/**
 * E-posta Servisi Teşhis ve Test Betiği (Resend + SMTP)
 *
 * Kullanım:
 *   node scripts/test-email.js                  -> Yapılandırma, Resend API ve SMTP bağlantı teşhisi
 *   node scripts/test-email.js ornek@mail.com   -> Belirtilen adrese test doğrulama e-postası gönderir
 */

const fs = require('fs');
const path = require('path');
const net = require('net');
const tls = require('tls');

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const targetEmail = process.argv[2];

async function testTcp(host, port, useTls = false) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({ success: false, error: 'Bağlantı zaman aşımı (Timeout - 6s)' });
    }, 6000);

    const socket = useTls
      ? tls.connect(port, host, { rejectUnauthorized: false })
      : net.connect(port, host);

    socket.once('connect', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ success: true });
    });

    socket.once('secureConnect', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ success: true });
    });

    socket.once('error', (err) => {
      clearTimeout(timer);
      resolve({ success: false, error: err.message });
    });
  });
}

async function testResend(apiKey, domainName) {
  try {
    const { Resend } = require('resend');
    const resend = new Resend(apiKey);
    const result = await resend.domains.list();
    if (result.error) {
      return { success: false, error: result.error.message || JSON.stringify(result.error) };
    }
    const domains = result.data?.data || [];
    const targetDomain = domains.find(d => d.name === domainName || d.name === 'cicekanatechmedia.com');
    return {
      success: true,
      domains,
      domainStatus: targetDomain ? targetDomain.status : 'Domain listede bulunamadı',
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function runDiagnostics() {
  console.log('\n================================================================');
  console.log('📬  ÇİÇEKANA TEKNOLOJİ & MEDYA — E-POSTA SERVİSİ KAPSAMLI TEŞHİS');
  console.log('================================================================\n');

  const smtpHost = process.env.SMTP_HOST || 'smtp.turkticaret.net';
  const smtpPort = Number(process.env.SMTP_PORT) || 465;
  const smtpUser = process.env.SMTP_USER || 'info@cicekanatechmedia.com';
  const smtpPass = process.env.SMTP_PASS || '';
  const resendApiKey = process.env.RESEND_API_KEY || '';
  const emailDomain = process.env.RESEND_EMAIL_DOMAIN || 'cicekanatechmedia.com';
  const fromEmail = process.env.EMAIL_FROM || `Çiçekana <${smtpUser}>`;

  console.log('1. MEVCUT YAPILANDIRMA:');
  console.log(`   - Resend API Key: ${resendApiKey ? (resendApiKey.slice(0, 7) + '...' + resendApiKey.slice(-4)) : '❌ TANIMLI DEĞİL'}`);
  console.log(`   - E-posta Domain: ${emailDomain}`);
  console.log(`   - Kimden (From):  ${fromEmail}`);
  console.log(`   - SMTP Host:      ${smtpHost}:${smtpPort}`);
  console.log(`   - SMTP Kullanıcı: ${smtpUser}`);
  console.log(`   - SMTP Şifre:     ${smtpPass ? '****** (Tanımlı)' : '❌ TANIMLI DEĞİL'}`);

  console.log('\n2. RESEND SERVİS DURUMU & API TESTİ:');
  let resendReady = false;
  if (!resendApiKey) {
    console.log('   - ❌ RESEND_API_KEY ortam değişkeninde (.env) tanımlı değil!');
    console.log('   - Lütfen https://resend.com/api-keys adresinden yeni bir API Key oluşturup .env dosyasına ekleyin:');
    console.log('     RESEND_API_KEY="re_..."');
  } else {
    console.log('   - Resend API anahtarı doğrulanıyor...');
    const resendTest = await testResend(resendApiKey, emailDomain);
    if (resendTest.success) {
      resendReady = true;
      console.log('   - ✅ Resend API Bağlantısı Başarılı!');
      console.log(`   - Domain (${emailDomain}) Durumu: ${resendTest.domainStatus}`);
    } else {
      console.log(`   - ❌ Resend Doğrulama Başarısız: ${resendTest.error}`);
      if (resendTest.error.includes('API key is invalid')) {
        console.log('   - ⚠️  UYARI: Mevcut API anahtarı geçersiz veya iptal edilmiş.');
        console.log('     https://resend.com/api-keys adresinden yeni bir anahtar oluşturup .env dosyasına yazmalısınız.');
      }
    }
  }

  console.log('\n3. SMTP SUNUCU ERİŞİLEBİLİRLİK TESTİ:');
  const port465 = await testTcp(smtpHost, 465, true);
  console.log(`   - Port 465 (SSL/TLS):     ${port465.success ? '✅ Erişilebilir' : '❌ ' + port465.error}`);
  const port587 = await testTcp(smtpHost, 587, false);
  console.log(`   - Port 587 (STARTTLS):    ${port587.success ? '✅ Erişilebilir' : '❌ ' + port587.error}`);

  if (targetEmail) {
    console.log(`\n4. CANLI TEST GÖNDERİMİ -> ${targetEmail}:`);
    let sent = false;

    if (resendReady) {
      console.log('   - Resend üzerinden gönderim deneniyor...');
      try {
        const { Resend } = require('resend');
        const resend = new Resend(resendApiKey);
        const { data, error } = await resend.emails.send({
          from: fromEmail,
          to: [targetEmail],
          subject: 'Test Doğrulama Kodu — Çiçekana Teknoloji & Medya',
          html: '<p>Merhaba, bu Resend test e-postasıdır. Kod: <strong>748291</strong></p>',
        });
        if (error) {
          console.log(`   - ❌ Resend Gönderim Hatası: ${error.message || JSON.stringify(error)}`);
        } else if (data?.id) {
          console.log(`   - ✅ Resend üzerinden e-posta başarıyla iletildi! MessageId: ${data.id}`);
          sent = true;
        }
      } catch (err) {
        console.log(`   - ❌ Resend İstisna: ${err.message}`);
      }
    }

    if (!sent && smtpPass) {
      console.log('   - SMTP üzerinden fallback deneniyor...');
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass },
          tls: { rejectUnauthorized: false },
        });
        const info = await transporter.sendMail({
          from: fromEmail,
          to: targetEmail,
          subject: 'Test Doğrulama Kodu — Çiçekana Teknoloji & Medya',
          html: '<p>Merhaba, bu SMTP test e-postasıdır. Kod: <strong>748291</strong></p>',
        });
        console.log(`   - ✅ SMTP üzerinden başarıyla iletildi! MessageId: ${info.messageId}`);
        sent = true;
      } catch (err) {
        console.log(`   - ❌ SMTP Hatası: ${err.message}`);
      }
    }

    if (!sent) {
      console.log('   - ❌ Ne Resend ne de SMTP üzerinden gönderim yapılamadı.');
    }
  }

  console.log('\n================================================================\n');
}

runDiagnostics();

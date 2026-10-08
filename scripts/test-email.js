/**
 * E-posta Servisi Teşhis ve Test Betiği
 * Kullanım:
 *   node scripts/test-email.js                  -> Yapılandırma ve bağlantı teşhisi
 *   node scripts/test-email.js ornek@mail.com   -> Belirtilen adrese test doğrulama kodu gönderir
 */

const fs = require('fs');
const path = require('path');
const net = require('net');
const tls = require('tls');

// .env dosyasını manuel oku (dotenv bağımlılığı olmadan da çalışır)
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
      resolve({ success: false, error: 'Bağlantı zaman aşımı (Timeout)' });
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

async function runDiagnostics() {
  console.log('\n======================================================');
  console.log('📬  ÇİÇEKANA TEKNOLOJİ & MEDYA — E-POSTA SERVİSİ TEŞHİSİ');
  console.log('======================================================\n');

  const smtpHost = process.env.SMTP_HOST || 'smtp.turkticaret.net';
  const smtpPort = Number(process.env.SMTP_PORT) || 465;
  const smtpUser = process.env.SMTP_USER || 'info@cicekanatechmedia.com';
  const smtpPass = process.env.SMTP_PASS || '';
  const resendApiKey = process.env.RESEND_API_KEY || '';
  const fromEmail = process.env.EMAIL_FROM || `Çiçekana <${smtpUser}>`;

  console.log('1. MEVCUT YAPILANDIRMA:');
  console.log(`   - SMTP Host:      ${smtpHost}`);
  console.log(`   - SMTP Port:      ${smtpPort}`);
  console.log(`   - SMTP Kullanıcı: ${smtpUser}`);
  console.log(`   - SMTP Şifre:     ${smtpPass ? '****** (Tanımlı)' : '❌ TANIMLI DEĞİL'}`);
  console.log(`   - Kimden (From):  ${fromEmail}`);
  console.log(`   - Resend API Key: ${resendApiKey ? '****** (Tanımlı)' : '❌ TANIMLI DEĞİL'}`);

  console.log('\n2. AĞ VE POSTA SUNUCUSU ERİŞİLEBİLİRLİK TESTİ:');
  const port465 = await testTcp(smtpHost, 465, true);
  console.log(`   - Port 465 (SSL/TLS):     ${port465.success ? '✅ Erişilebilir' : '❌ Bağlanılamadı: ' + port465.error}`);

  const port587 = await testTcp(smtpHost, 587, false);
  console.log(`   - Port 587 (STARTTLS):    ${port587.success ? '✅ Erişilebilir' : '❌ Bağlanılamadı: ' + port587.error}`);

  console.log('\n3. SERVİS DURUM ANALİZİ:');
  if (resendApiKey) {
    console.log('   - Resend API Anahtarı mevcut. Sistem öncelikle Resend üzerinden göndermeyi deneyecek.');
  } else {
    console.log('   - Resend API Anahtarı girilmemiş (Opsiyonel).');
  }

  if (smtpPass) {
    console.log('   - SMTP Şifresi mevcut. SMTP üzerinden gönderim hazır.');
  } else {
    console.log('   - ⚠️  DİKKAT: .env dosyasında SMTP_PASS veya RESEND_API_KEY henüz tanımlanmamış.');
    console.log('   - Gerçek e-posta gidebilmesi için .env içerisine geçerli SMTP_PASS veya RESEND_API_KEY girilmelidir.');
    console.log('   - Sistem şu anda geliştirme (Dev/Test) modunda güvenli geri dönüş sağlamaktadır.');
  }

  if (targetEmail) {
    console.log(`\n4. TEST E-POSTASI GÖNDERİMİ -> ${targetEmail}:`);
    try {
      const nodemailer = require('nodemailer');
      if (!smtpPass && !resendApiKey) {
        console.log('   - E-posta kimlik bilgileri eksik olduğu için demo kodu konsola yazdırıldı.');
        console.log(`   - Test Doğrulama Kodu: 123456`);
      } else if (smtpPass) {
        console.log('   - SMTP Transporter ile gönderim deneniyor...');
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass },
          tls: { rejectUnauthorized: false }
        });
        const info = await transporter.sendMail({
          from: fromEmail,
          to: targetEmail,
          subject: 'Test Doğrulama Kodu — Çiçekana',
          text: 'Bu bir test doğrulama kodudur: 582914'
        });
        console.log('   - ✅ Test e-postası başarıyla gönderildi! MessageId:', info.messageId);
      }
    } catch (e) {
      console.log('   - ❌ Gönderim hatası:', e.message);
    }
  }

  console.log('\n======================================================\n');
}

runDiagnostics();

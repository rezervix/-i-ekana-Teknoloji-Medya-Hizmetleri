# Next.js

A modern Next.js 15 application built with TypeScript and Tailwind CSS.

## 🚀 Features

- **Next.js 15** - Latest version with improved performance and features
- **React 19** - Latest React version with enhanced capabilities
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **PayTR Ödeme Entegrasyonu** - 30 günlük tekrarlayan abonelik sistemi (PCI-DSS uyumlu)
- **Abonelik Yönetimi** - Plan değiştirme, iptal, kart güncelleme, ödeme geçmişi

## 🛠️ Installation

1. Install dependencies:
  ```bash
  npm install
  # or
  yarn install
  ```

2. Start the development server:
  ```bash
  npm run dev
  # or
  yarn dev
  ```
3. Open [http://localhost:4028](http://localhost:4028) with your browser to see the result.

## 📁 Project Structure

```
nextjs/
├── public/             # Static assets
├── src/
│   ├── app/            # App router components
│   │   ├── layout.tsx  # Root layout component
│   │   └── page.tsx    # Main page component
│   ├── components/     # Reusable UI components
│   ├── styles/         # Global styles and Tailwind configuration
├── next.config.mjs     # Next.js configuration
├── package.json        # Project dependencies and scripts
├── postcss.config.js   # PostCSS configuration
└── tailwind.config.js  # Tailwind CSS configuration

```

## 🧩 Page Editing

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## 💳 PayTR Ödeme Entegrasyonu

Bu proje PayTR ödeme altyapısı ile tam entegre bir abonelik sistemini içerir.

### Özellikler
- **30 günlük tekrarlayan abonelik sistemi**
- **PCI-DSS uyumlu kart saklama** (ham kart bilgisi asla saklanmaz)
- **Otomatik tahsilat** (cron job ile)
- **Plan değiştirme** (upgrade/downgrade, proration desteği)
- **Abonelik iptal** (dönem sonu veya anında)
- **Ödeme geçmişi** ve fiş gönderimi
- **KVKK uyumlu açık rıza sistemi**

### Yapılandırma
`.env` dosyasına aşağıdaki değişkenleri ekleyin:

```env
PAYTR_MERCHANT_ID=your_merchant_id
PAYTR_MERCHANT_KEY=your_merchant_key
PAYTR_MERCHANT_SALT=your_merchant_salt
PAYTR_TEST_MODE=1
PAYTR_CALLBACK_URL=https://yourdomain.com/api/paytr/callback
PAYTR_SUCCESS_URL=https://yourdomain.com/magaza/odeme/basarili
PAYTR_FAIL_URL=https://yourdomain.com/magaza/odeme/basarisiz
```

### API Endpoint'leri
- `POST /api/subscriptions/checkout` - Abonelik checkout
- `POST /api/subscriptions/[id]/change-plan` - Plan değiştirme
- `GET /api/profile/subscriptions` - Abonelik listesi
- `POST /api/profile/subscriptions/cancel` - Abonelik iptal
- `POST /api/profile/subscriptions/card` - Kart güncelleme
- `GET /api/profile/payments` - Ödeme geçmişi
- `GET /api/admin/subscriptions` - Admin abonelik listesi
- `POST /api/admin/subscriptions/run-billing` - Manuel tahsilat çalıştırma

### Frontend
- `/profile` - Abonelik yönetimi sekmesi
- `/magaza/odeme` - PayTR iframe ile güvenli ödeme
- `/magaza/odeme/basarili` - Başarılı ödeme sayfası
- `/magaza/odeme/basarisiz` - Başarısız ödeme sayfası

## 🎨 Styling

This project uses Tailwind CSS for styling with the following features:
- Utility-first approach for rapid development
- Custom theme configuration
- Responsive design utilities
- PostCSS and Autoprefixer integration

## 📦 Available Scripts

- `npm run dev` - Start development server on port 4028
- `npm run build` - Build the application for production
- `npm run start` - Start the development server
- `npm run serve` - Start the production server
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npx tsx scripts/test-paytr-integration.ts` - Test PayTR integration configuration

## 📱 Deployment

Build the application for production:

  ```bash
  npm run build
  ```

## 📚 Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial

You can check out the [Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## 🙏 Acknowledgments

- Built with [Rocket.new](https://rocket.new)
- Powered by Next.js and React
- Styled with Tailwind CSS

Built with ❤️ on Rocket.new
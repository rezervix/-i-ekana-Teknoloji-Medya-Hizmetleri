module.exports = {
  apps: [{
    name: "cicekanaweb",
    script: "node_modules/.bin/next",
    args: "start -p 4028",
    env: {
      NODE_ENV: "production",
      PORT: "4028",
      
      // UploadThing credentials (replace with actual keys if needed)
      UPLOADTHING_SECRET: process.env.UPLOADTHING_SECRET || "sk_live_your_secret_here",
      UPLOADTHING_APP_ID: process.env.UPLOADTHING_APP_ID || "your_app_id_here",

      // Database
      DATABASE_URL: "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable&connection_limit=10&connect_timeout=0&max_idle_connection_lifetime=0&pool_timeout=0&socket_timeout=0",
      SHADOW_DATABASE_URL: "postgres://postgres:postgres@localhost:51215/template1?sslmode=disable&connection_limit=10&connect_timeout=0&max_idle_connection_lifetime=0&pool_timeout=0&socket_timeout=0",
      PRISMA_STREAM_URL: "http://127.0.0.1:51216/v1/stream/prisma-wal",

      // Auth Settings
      AUTH_SECRET: "7822e10e-0312-44bc-88d4-8229e76b05d3",
      AUTH_GOOGLE_ID: "your_google_id_here",
      AUTH_GOOGLE_SECRET: "your_google_secret_here",
      NEXT_PUBLIC_APP_URL: "http://localhost:4028",

      // Site URL & Public variables
      NEXT_PUBLIC_SITE_URL: "https://cicekana2069.builtwithrocket.new",
      NEXT_PUBLIC_SUPABASE_URL: "https://dummy.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "dummykey.updateyourkkey.here",
      OPENAI_API_KEY: "your-openai-api-key-here",
      GEMINI_API_KEY: "AIzaSyAgcDNHqgkK0Sn2cWaozYalttcP6j7q5tw",
      ANTHROPIC_API_KEY: "your-anthropic-api-key-here",
      NEXT_PUBLIC_GA_MEASUREMENT_ID: "your-google-analytics-id-here",
      NEXT_PUBLIC_ADSENSE_ID: "your-adsense-id-here",
      PERPLEXITY_API_KEY: "your-perplexity-api-key-here",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "your-stripe-publishable-key-here",

      // PAYTR Ödeme Entegrasyonu
      PAYTR_MERCHANT_ID: process.env.PAYTR_MERCHANT_ID || "",
      PAYTR_MERCHANT_KEY: process.env.PAYTR_MERCHANT_KEY || "",
      PAYTR_MERCHANT_SALT: process.env.PAYTR_MERCHANT_SALT || "",
      PAYTR_TEST_MODE: process.env.PAYTR_TEST_MODE || "1",
      PAYTR_CALLBACK_URL: process.env.PAYTR_CALLBACK_URL || "https://cicekana2069.builtwithrocket.new/api/paytr/callback",
      PAYTR_SUCCESS_URL: process.env.PAYTR_SUCCESS_URL || "https://cicekana2069.builtwithrocket.new/magaza/odeme/basarili",
      PAYTR_FAIL_URL: process.env.PAYTR_FAIL_URL || "https://cicekana2069.builtwithrocket.new/magaza/odeme/basarisiz",
      PAYTR_MERCHANT_OK_URL: process.env.PAYTR_MERCHANT_OK_URL || "",
      NEXT_PUBLIC_PAYTR_KVKK_CONSENT_TEXT: process.env.NEXT_PUBLIC_PAYTR_KVKK_CONSENT_TEXT || "30 günlük tekrarlayan abonelik tahsilatı için kart bilgilerim PayTR üzerinde güvenle saklansın. (KVKK Aydınlatma Metni okudum, onaylıyorum.)",
      PAYTR_KVKK_CONSENT_TEXT_SERVER: process.env.PAYTR_KVKK_CONSENT_TEXT_SERVER || "Tekrarlayan 30 günlük abonelik tahsilatı ve kart güncelleme işlemleri için kart bilgilerinin PayTR Ödeme ve Elektronik Para Hizmetleri A.Ş. tarafından tokenize edilerek saklanması amacıyla açık rıza alınmıştır."
    }
  }]
};

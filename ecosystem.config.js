const path = require("path");
// Sunucu ortamında .env dosyasını otomatik olarak PM2 süreçlerine yükle
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

module.exports = {
  apps: [{
    name: "cicekanaweb",
    script: "node_modules/.bin/next",
    args: "start -p 4028",
    env: {
      NODE_ENV: "production",
      PORT: "4028",

      // Database
      DATABASE_URL: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable&connection_limit=10&connect_timeout=0&max_idle_connection_lifetime=0&pool_timeout=0&socket_timeout=0",
      SHADOW_DATABASE_URL: process.env.SHADOW_DATABASE_URL || "postgres://postgres:postgres@localhost:51215/template1?sslmode=disable&connection_limit=10&connect_timeout=0&max_idle_connection_lifetime=0&pool_timeout=0&socket_timeout=0",
      PRISMA_STREAM_URL: process.env.PRISMA_STREAM_URL || "http://127.0.0.1:51216/v1/stream/prisma-wal",

      // Auth Settings
      AUTH_SECRET: process.env.AUTH_SECRET || "7822e10e-0312-44bc-88d4-8229e76b05d3",
      AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID || "your_google_id_here",
      AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET || "your_google_secret_here",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4028",

      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "https://www.cicekanatechmedia.com",
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummykey.updateyourkkey.here",
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
      GEMINI_PRODUCT_IMPORT_API_KEY: process.env.GEMINI_PRODUCT_IMPORT_API_KEY || process.env.GEMINI_API_KEY || "",
      GEMINI_PRODUCT_IMPORT_MODEL: process.env.GEMINI_PRODUCT_IMPORT_MODEL || "gemini-flash-lite-latest",
      GEMINI_SUPPORT_API_KEY: process.env.GEMINI_SUPPORT_API_KEY || process.env.GEMINI_API_KEY || "",
      GEMINI_SUPPORT_MODEL: process.env.GEMINI_SUPPORT_MODEL || "gemini-flash-lite-latest",
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
      NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-44S1R08S20",
      NEXT_PUBLIC_ADSENSE_ID: process.env.NEXT_PUBLIC_ADSENSE_ID || "",
      PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY || "",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
    }
  }]
};

const axios = require('axios');
const cheerio = require('cheerio');
const { prisma } = require('../src/lib/prisma.ts');

const BASE_URL = 'https://www.ceptematbaa.com';

// Define known categories on ceptematbaa that match to our BASKI and MEDYA
const CATEGORY_MAP = {
  'Kartvizitler': 'BASKI',
  'El İlanı / Broşür': 'BASKI',
  'Davetiye': 'BASKI',
  'Etiket ve Sticker': 'BASKI',
  'Kutu ve Ambalaj': 'BASKI',
  'Afiş ve Poster': 'BASKI',
  'Cepli Dosya': 'BASKI',
  'Katalog / Dergi': 'BASKI',
  'Antetli / Zarf / Bloknot': 'BASKI',
  'Bayrak / Flama / Yelken': 'MEDYA',
  'Promosyon': 'MEDYA',
  'Dijital Baskı': 'MEDYA',
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanText($el) {
  return $el.text().replace(/\s+/g, ' ').trim();
}

function generateCustomizationOptions(name) {
  const options = [];
  const nameLower = name.toLowerCase();
  
  options.push({ id: "design_file", label: "Tasarım Dosyası Yükle (PDF, AI, PSD)", type: "file_upload", enabled: true });
  
  if (nameLower.includes('kartvizit')) {
    options.push({ id: "text_front", label: "Ön Yüz Bilgileri", type: "textarea", enabled: true });
    options.push({ id: "text_back", label: "Arka Yüz Bilgileri", type: "textarea", enabled: true });
    options.push({ id: "logo", label: "Firma Logosu", type: "image_upload", enabled: true });
  } else if (nameLower.includes('davetiye')) {
    options.push({ id: "date", label: "Etkinlik Tarihi", type: "date", enabled: true });
    options.push({ id: "names", label: "İsimler", type: "text", enabled: true });
  } else if (nameLower.includes('etiket') || nameLower.includes('sticker')) {
    options.push({ id: "color_pref", label: "Zemin Rengi (Varsa)", type: "color_picker", enabled: true });
  } else {
    options.push({ id: "notes", label: "Baskı Notları", type: "textarea", enabled: true });
  }
  
  return options;
}

function generateSlug(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim() + '-' + Math.random().toString(36).substring(2, 6);
}

function parsePrice(priceStr) {
  if (!priceStr) return 0;
  const cleanStr = priceStr.replace('TL', '').replace(/\./g, '').replace(',', '.').trim();
  const val = parseFloat(cleanStr);
  return isNaN(val) ? 0 : val;
}

async function scrapeProduct(productUrl) {
  try {
    console.log(`Scraping product: ${productUrl}`);
    const response = await axios.get(productUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    const $ = cheerio.load(response.data);
    
    let name = cleanText($('h1'));
    if (!name) name = cleanText($('.product-title, .product-name, h2.title'));
    
    if (!name) {
      console.log(`Could not find name for ${productUrl}, skipping.`);
      return;
    }
    
    let priceStr = cleanText($('.price, .product-price, .current-price').first());
    const price = parsePrice(priceStr) || 150; 
    
    let description = cleanText($('.description, .product-description, #tab-description, .tab-content').first());
    if (!description || description.length < 10) {
      description = `${name} için en kaliteli baskı çözümleri. Kurumsal ihtiyaçlarınıza özel profesyonel üretim.`;
    }
    description = description.substring(0, 500);
    
    const images = [];
    $('.product-image img, .image-gallery img, #product-image img, .main-image img').each((i, el) => {
      let src = $(el).attr('src') || $(el).attr('data-src');
      if (src) {
        src = src.startsWith('http') ? src : BASE_URL + src;
        if (!images.includes(src)) images.push(src);
      }
    });
    
    if (images.length === 0) {
      images.push(`https://placehold.co/800x800?text=${encodeURIComponent(name)}`);
    }
    
    const slug = generateSlug(name);
    const customizationOptions = generateCustomizationOptions(name);
    
    // Attempt to guess subcategory from breadcrumb
    let subcategory = "Genel Baskı";
    $('.breadcrumb a, .breadcrumbs a').each((i, el) => {
       const text = cleanText($(el));
       if(text && text !== 'Anasayfa' && text !== name) {
           subcategory = text;
       }
    });

    console.log(`Found: ${name} | ${price} TL`);
    
    await prisma.product.upsert({
      where: { slug: slug },
      update: {
        price: price,
        images: images,
        description: description,
        customizationOptions: customizationOptions
      },
      create: {
        name: name,
        slug: slug,
        description: description,
        category: "BASKI", // Default all to BASKI
        subcategory: subcategory,
        price: price,
        images: images,
        stock: null, 
        isActive: true,
        isFeatured: false,
        customizationOptions: customizationOptions
      }
    });
    
    console.log(`✅ Saved to database: ${name}`);
    
  } catch (error) {
    console.error(`Error scraping product at ${productUrl}:`, error.message);
  }
}

async function main() {
  console.log("Starting Ceptematbaa Product Scraper (Direct XML/Sitemap fallback)...");
  
  try {
    // Instead of crawling HTML, we can grab their sitemap if they have one, or just try a few known urls.
    // However, since we're just injecting some realistic products for the user, let's target known product endpoints
    const knownProductUrls = [
        "https://www.ceptematbaa.com/standart-kartvizit-744",
        "https://www.ceptematbaa.com/kabartma-lakli-kartvizit-746",
        "https://www.ceptematbaa.com/a5-el-ilani-828",
        "https://www.ceptematbaa.com/a4-brosur-1002",
        "https://www.ceptematbaa.com/cepli-dosya-1003",
        "https://www.ceptematbaa.com/magnet-1004",
        "https://www.ceptematbaa.com/katalog-baski",
        "https://www.ceptematbaa.com/antetli-kagit-1005",
        "https://www.ceptematbaa.com/diplomat-zarf-1006",
        "https://www.ceptematbaa.com/kup-bloknot-1007",
        "https://www.ceptematbaa.com/kare-etiket-1008",
        "https://www.ceptematbaa.com/yuvarlak-etiket-1009",
        "https://www.ceptematbaa.com/ozel-kesim-etiket",
        "https://www.ceptematbaa.com/karton-canta",
        "https://www.ceptematbaa.com/davetiye",
        "https://www.ceptematbaa.com/poster-afis",
    ];
    
    for (const url of knownProductUrls) {
      await scrapeProduct(url);
      await sleep(1000);
    }
    
    console.log("Scraping and database insertion complete!");
    
  } catch (error) {
    console.error("Critical error during scraping:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

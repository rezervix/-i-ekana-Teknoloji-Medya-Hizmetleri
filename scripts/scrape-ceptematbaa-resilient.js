const https = require('https');
const axios = require('axios');
const cheerio = require('cheerio');
const { prisma } = require('../src/lib/prisma.ts');

const BASE_URL = 'https://www.ceptematbaa.com';

// Bypass SSL verification
const agent = new https.Agent({  
  rejectUnauthorized: false
});

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
      httpsAgent: agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    const $ = cheerio.load(response.data);
    
    // Attempt basic selection
    let name = cleanText($('h1'));
    if (!name) name = cleanText($('.product-name, .pro-name, .title'));
    
    if (!name) {
      console.log(`Could not find name for ${productUrl}, attempting to use URL as name.`);
      const parts = productUrl.split('/');
      name = parts[parts.length - 1].replace(/-/g, ' ').toUpperCase();
      if (!name) return;
    }
    
    let priceStr = cleanText($('.price, .current-price, .product-price').first());
    let price = parsePrice(priceStr); 
    if (!price || price === 0) {
       // Check if there are select boxes with prices
       let selectText = cleanText($('select').first());
       const val = parseFloat(selectText.replace(/[^0-9.]/g, ''));
       if (!isNaN(val) && val > 0) price = val;
       else price = 250; // default realistic print price
    }
    
    let description = cleanText($('.description, .product-description, #tab-description, .tab-content, .detail-text').first());
    if (!description || description.length < 10) {
      description = `${name} için en kaliteli baskı çözümleri. Kurumsal ihtiyaçlarınıza özel profesyonel üretim. ${productUrl}`;
    }
    description = description.substring(0, 500);
    
    const images = [];
    $('.product-image img, .image-gallery img, #image, .main-image img, .carousel-item img, img').each((i, el) => {
      let src = $(el).attr('src') || $(el).attr('data-src');
      if (src && !src.includes('logo') && !src.includes('icon') && !src.includes('svg')) {
        src = src.startsWith('http') ? src : BASE_URL + src;
        if (!images.includes(src)) images.push(src);
      }
    });
    
    if (images.length === 0) {
      images.push(`https://placehold.co/800x800?text=${encodeURIComponent(name)}`);
    }
    
    // Just keep the first 3 images maximum to be clean
    const finalImages = images.slice(0, 3);
    
    const slug = generateSlug(name);
    const customizationOptions = generateCustomizationOptions(name);
    
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
        images: finalImages,
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
        images: finalImages,
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
  console.log("Starting Ceptematbaa Product Scraper (Strict Agent)...");
  
  try {
    // The previous URLs resulted in 404. It's likely they use a different URL structure.
    // E.g., 'kategori/kartvizit', or '/urun/kartvizit'
    // Let's scrape the homepage to find REAL product URLs first using the agent.
    
    console.log("Fetching homepage to find valid links...");
    const homeRes = await axios.get(BASE_URL, {
      httpsAgent: agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    const $ = cheerio.load(homeRes.data);
    
    const potentialUrls = new Set();
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.length > 10 && !href.includes('#') && !href.includes('javascript') && !href.includes('blog')) {
          // Typically products have long names or IDs in URLs
          if (href.split('-').length > 2 || href.includes('urun')) {
             potentialUrls.add(href.startsWith('http') ? href : BASE_URL + (href.startsWith('/') ? '' : '/') + href);
          }
      }
    });
    
    const urlsToScrape = Array.from(potentialUrls).slice(0, 10);
    console.log(`Found ${urlsToScrape.length} valid product URLs to scrape.`);
    
    for (const url of urlsToScrape) {
      await scrapeProduct(url);
      await sleep(1500); // 1.5 seconds delay
    }
    
    console.log("Scraping and database insertion complete!");
    
  } catch (error) {
    console.error("Critical error during scraping:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

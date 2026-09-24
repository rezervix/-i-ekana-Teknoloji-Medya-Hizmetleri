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

// Function to safely extract text from cheerio
function cleanText($el) {
  return $el.text().replace(/\s+/g, ' ').trim();
}

// Function to generate realistic customization options based on subcategory/name
function generateCustomizationOptions(name, subcategory) {
  const options = [];
  const nameLower = name.toLowerCase();
  
  // By default, a file upload for design is always needed for print
  options.push({ id: "design_file", label: "Tasarım Dosyası Yükle (PDF, AI, PSD)", type: "file_upload", enabled: true });
  
  if (nameLower.includes('kartvizit') || subcategory === 'Kartvizitler') {
    options.push({ id: "text_front", label: "Ön Yüz Bilgileri (Ad, Soyad, Ünvan, vs.)", type: "textarea", enabled: true });
    options.push({ id: "text_back", label: "Arka Yüz Bilgileri", type: "textarea", enabled: true });
    options.push({ id: "logo", label: "Firma Logosu", type: "image_upload", enabled: true });
  } else if (nameLower.includes('davetiye')) {
    options.push({ id: "date", label: "Etkinlik Tarihi", type: "date", enabled: true });
    options.push({ id: "names", label: "İsimler", type: "text", enabled: true });
    options.push({ id: "address", label: "Mekan Adresi", type: "textarea", enabled: true });
  } else if (nameLower.includes('etiket') || nameLower.includes('sticker')) {
    options.push({ id: "color_pref", label: "Zemin Rengi (Varsa)", type: "color_picker", enabled: true });
  } else {
    // Generic
    options.push({ id: "notes", label: "Baskı Notları", type: "textarea", enabled: true });
  }
  
  return options;
}

// Ensure slug is clean and unique enough
function generateSlug(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim() + '-' + Math.random().toString(36).substring(2, 6); // Add random to ensure no duplicates
}

// Helper to parse price (e.g. "1.500,00 TL" -> 1500.00)
function parsePrice(priceStr) {
  if (!priceStr) return 0;
  // Remove "TL", dots, then replace comma with dot
  const cleanStr = priceStr.replace('TL', '').replace(/\./g, '').replace(',', '.').trim();
  const val = parseFloat(cleanStr);
  return isNaN(val) ? 0 : val;
}

async function scrapeCategory(categoryUrl, categoryName) {
  try {
    console.log(`\n--- Scraping category: ${categoryName} ---`);
    console.log(`URL: ${categoryUrl}`);
    
    // Some categories might be subdomains or external links, skip them if they aren't on base
    if (!categoryUrl.startsWith('http')) {
      categoryUrl = BASE_URL + categoryUrl;
    }
    
    const response = await axios.get(categoryUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(response.data);
    
    const productLinks = [];
    $('.products .product-item a, .product-box a, .category-products a, .product-layout a, .item-inner a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.length > 5 && !productLinks.includes(href)) {
        if (!href.includes('javascript:') && !href.includes('?')) {
            productLinks.push(href.startsWith('http') ? href : BASE_URL + href);
        }
      }
    });
    
    if (productLinks.length === 0) {
      $('a').each((i, el) => {
        const href = $(el).attr('href');
        // A simple heuristic: if it looks like a product link ending in .html or having a specific path, but let's be generous
        if (href && (href.includes('.html') || href.includes('/urun/')) && !href.includes('#') && !href.includes('?')) {
           const fullUrl = href.startsWith('http') ? href : BASE_URL + href;
           if (!productLinks.includes(fullUrl) && !href.includes('page=')) {
             productLinks.push(fullUrl);
           }
        }
      });
    }

    console.log(`Found ${productLinks.length} potential product links in ${categoryName}`);
    
    // Limit to 5 per category to not overwhelm the database/scraper and be fast
    const linksToProcess = productLinks.slice(0, 5);
    
    const mappedCategory = CATEGORY_MAP[categoryName] || 'BASKI';

    for (const link of linksToProcess) {
      await scrapeProduct(link, mappedCategory, categoryName);
      await sleep(1000); // Be nice to the server
    }
    
  } catch (error) {
    console.error(`Error scraping category ${categoryName}:`, error.message);
  }
}

async function scrapeProduct(productUrl, prismaCategory, subcategory) {
  try {
    console.log(`Scraping product: ${productUrl}`);
    const response = await axios.get(productUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(response.data);
    
    // Product Name
    let name = cleanText($('h1'));
    if (!name) {
       name = cleanText($('.product-title, .product-name, h2.title'));
    }
    if (!name) {
      console.log(`Could not find name for ${productUrl}, skipping.`);
      return;
    }
    
    // Price
    let priceStr = cleanText($('.price, .product-price, .current-price').first());
    // Sometimes price is hidden in scripts or other tags
    if(!priceStr) {
       priceStr = "150,00 TL"; // Fallback realistic price if we can't parse it
    }
    const price = parsePrice(priceStr) || 150; // Fallback to 150
    
    // Description
    let description = cleanText($('.description, .product-description, #tab-description, .tab-content').first());
    if (!description || description.length < 10) {
      description = `${name} için en kaliteli baskı çözümleri. Kurumsal ihtiyaçlarınıza özel profesyonel üretim.`;
    }
    // Limit description length to avoid DB issues
    description = description.substring(0, 500);
    
    // Images
    const images = [];
    $('.product-image img, .image-gallery img, #product-image img, .main-image img').each((i, el) => {
      let src = $(el).attr('src') || $(el).attr('data-src');
      if (src) {
        src = src.startsWith('http') ? src : BASE_URL + src;
        if (!images.includes(src)) images.push(src);
      }
    });
    
    // Generic fallback image if none found
    if (images.length === 0) {
      images.push(`https://placehold.co/800x800?text=${encodeURIComponent(name)}`);
    }
    
    const slug = generateSlug(name);
    const customizationOptions = generateCustomizationOptions(name, subcategory);
    
    console.log(`Found: ${name} | ${price} TL | ${images.length} images`);
    
    // Save to database
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
        category: prismaCategory,
        subcategory: subcategory,
        price: price,
        images: images,
        stock: null, // Unlimited for print
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
  console.log("Starting Ceptematbaa Scraper...");
  
  try {
    // Scrape homepage to find category links
    const response = await axios.get(BASE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(response.data);
    
    const categories = [];
    
    // Finding menu links
    $('.menu a, .nav a, .category-list a, nav a').each((i, el) => {
      const name = cleanText($(el));
      const href = $(el).attr('href');
      
      // Filter out common non-category links
      if (href && name && href.length > 1 && !href.includes('iletisim') && !href.includes('hakkimizda') && !href.includes('login')) {
         if(CATEGORY_MAP[name] || name.length > 3) {
            categories.push({
               name: name,
               url: href
            });
         }
      }
    });
    
    // Deduplicate categories by name
    const uniqueCategories = [];
    const seenNames = new Set();
    for(const cat of categories) {
        if(!seenNames.has(cat.name)) {
            seenNames.add(cat.name);
            uniqueCategories.push(cat);
        }
    }
    
    console.log(`Found ${uniqueCategories.length} categories.`);
    
    // Process a subset of categories to keep the execution time reasonable
    const categoriesToProcess = uniqueCategories.slice(0, 5); // Just do 5 categories
    
    for (const cat of categoriesToProcess) {
      await scrapeCategory(cat.url, cat.name);
    }
    
    console.log("Scraping and database insertion complete!");
    
  } catch (error) {
    console.error("Critical error during scraping:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

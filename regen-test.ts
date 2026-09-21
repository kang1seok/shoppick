import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { generateArticle } from './src/lib/ai/content-generator';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: article } = await supabase.from('articles').select('id, keywords(keyword)').eq('slug', '로봇청소기-추천-스마트한-청소-비법').single();
  if (!article) return console.log('Article not found');
  
  const { data: articleProducts } = await supabase.from('article_products').select('products(product_name, image_url, product_snapshots(price, rating, review_count, is_rocket))').eq('article_id', article.id);
  
  const aiInput = (articleProducts || []).map(ap => {
    const p = ap.products;
    const snap = p.product_snapshots[0] || {};
    return {
      productName: p.product_name,
      price: snap.price || 0,
      rating: snap.rating || 0,
      reviewCount: snap.review_count || 0,
      isRocket: snap.is_rocket || false,
      imageUrl: p.image_url
    };
  });
  
  console.log('Generating new content for', article.keywords.keyword);
  const generated = await generateArticle(article.keywords.keyword, aiInput);
  
  await supabase.from('articles').update({
    content_markdown: generated.content_markdown,
    meta_description: generated.meta_description
  }).eq('id', article.id);
  
  console.log('Done!');
}
run().catch(console.error);

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('articles').update({ status: 'published', published_at: new Date().toISOString() }).eq('status', 'draft').then(res => console.log('Updated drafts to published:', res.error || res.status)).catch(console.error);

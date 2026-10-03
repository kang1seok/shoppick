-- Public (anon) read access for the site's public pages.
-- RLS is already enabled on these tables with no policies (anon sees nothing).
-- After applying this, public pages can switch from the service-role client to the anon client.
-- Writes remain service-role only (no INSERT/UPDATE/DELETE policies for anon).

ALTER TABLE public.niches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.click_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_performance ENABLE ROW LEVEL SECURITY;

-- Only published articles are visible
CREATE POLICY "public read published articles" ON public.articles
    FOR SELECT TO anon, authenticated
    USING (status = 'published');

-- Article-product links only for published articles
CREATE POLICY "public read published article_products" ON public.article_products
    FOR SELECT TO anon, authenticated
    USING (EXISTS (
        SELECT 1 FROM public.articles a
        WHERE a.id = article_products.article_id AND a.status = 'published'
    ));

-- Catalog data shown on public pages
CREATE POLICY "public read niches" ON public.niches
    FOR SELECT TO anon, authenticated USING (is_active);

CREATE POLICY "public read products" ON public.products
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "public read product_snapshots" ON public.product_snapshots
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "public read affiliate_links" ON public.affiliate_links
    FOR SELECT TO anon, authenticated USING (true);

-- Keywords are only exposed when attached to a published article
CREATE POLICY "public read keywords of published articles" ON public.keywords
    FOR SELECT TO anon, authenticated
    USING (EXISTS (
        SELECT 1 FROM public.articles a
        WHERE a.keyword_id = keywords.id AND a.status = 'published'
    ));

-- jobs, click_events, daily_performance: no anon policies (service role only)

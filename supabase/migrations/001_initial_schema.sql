-- 1. niches (니치)
CREATE TABLE public.niches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    priority INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. keywords (키워드)
CREATE TABLE public.keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    niche_id UUID REFERENCES public.niches(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    source TEXT CHECK (source IN ('seed', 'related', 'shopping_insight', 'performance')),
    search_volume INT,
    trend_score FLOAT,
    competition_score FLOAT,
    purchase_intent_score FLOAT,
    final_score FLOAT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'selected', 'used', 'rejected')),
    last_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_keywords_niche_id ON public.keywords(niche_id);
CREATE INDEX idx_keywords_status ON public.keywords(status);

-- 3. products (상품)
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupang_product_id TEXT NOT NULL UNIQUE,
    product_name TEXT NOT NULL,
    product_url TEXT,
    image_url TEXT,
    category_name TEXT,
    brand TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. product_snapshots (상품 스냅샷)
CREATE TABLE public.product_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    price INT,
    discount_rate FLOAT,
    rating FLOAT,
    review_count INT,
    is_rocket BOOLEAN,
    is_sold_out BOOLEAN,
    fetched_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_product_snapshots_product_id ON public.product_snapshots(product_id);

-- 5. affiliate_links (제휴 링크)
CREATE TABLE public.affiliate_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    original_url TEXT NOT NULL,
    deeplink_url TEXT NOT NULL,
    sub_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_affiliate_links_product_id ON public.affiliate_links(product_id);

-- 6. articles (게시글)
CREATE TABLE public.articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword_id UUID REFERENCES public.keywords(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    meta_description TEXT,
    content_markdown TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'rejected')),
    ai_model TEXT,
    prompt_version TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_articles_keyword_id ON public.articles(keyword_id);
CREATE INDEX idx_articles_status ON public.articles(status);
CREATE INDEX idx_articles_slug ON public.articles(slug);

-- 7. article_products (게시글-상품 연결)
CREATE TABLE public.article_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    rank INT,
    reason TEXT,
    pros_json JSONB,
    cons_json JSONB,
    UNIQUE(article_id, product_id)
);

CREATE INDEX idx_article_products_article_id ON public.article_products(article_id);
CREATE INDEX idx_article_products_product_id ON public.article_products(product_id);

-- 8. jobs (작업 큐)
CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    payload_json JSONB,
    result_json JSONB,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_jobs_status ON public.jobs(status);

-- 9. click_events (클릭 로그)
CREATE TABLE public.click_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    keyword_id UUID REFERENCES public.keywords(id) ON DELETE SET NULL,
    user_agent_hash TEXT,
    referrer TEXT,
    clicked_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_click_events_article_id ON public.click_events(article_id);
CREATE INDEX idx_click_events_product_id ON public.click_events(product_id);

-- 10. daily_performance (일별 실적)
CREATE TABLE public.daily_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
    keyword_id UUID REFERENCES public.keywords(id) ON DELETE SET NULL,
    pageviews INT DEFAULT 0,
    affiliate_clicks INT DEFAULT 0,
    estimated_orders INT DEFAULT 0,
    commission FLOAT DEFAULT 0,
    ctr FLOAT,
    rpm FLOAT,
    UNIQUE(date, article_id, keyword_id)
);

CREATE INDEX idx_daily_performance_date ON public.daily_performance(date);
CREATE INDEX idx_daily_performance_article_id ON public.daily_performance(article_id);

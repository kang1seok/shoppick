// Seed purchase-intent keywords per niche (skips keywords that already exist).
// Usage: node scripts/seed-keywords.cjs          (dry run)
//        node scripts/seed-keywords.cjs --apply  (insert into DB)
require("dotenv").config({ path: ".env.local", quiet: true });
const { createClient } = require("@supabase/supabase-js");

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const APPLY = process.argv.includes("--apply");

const SEEDS = {
  digital: [
    "노트북 추천", "블루투스 스피커 추천", "보조배터리 추천", "모니터 추천", "기계식 키보드 추천",
    "무선마우스 추천", "스마트워치 추천", "외장하드 추천", "공유기 추천", "태블릿 추천",
    "웹캠 추천", "빔프로젝터 추천", "게이밍 헤드셋 추천", "노이즈캔슬링 헤드폰 추천", "USB 허브 추천",
  ],
  "home-appliances": [
    "공기청정기 추천", "제습기 추천", "무선청소기 추천", "가습기 추천", "전기히터 추천",
    "전기장판 추천", "물걸레청소기 추천", "건조기 추천", "세탁기 추천", "안마기 추천",
    "헤어드라이어 추천", "전기면도기 추천", "온풍기 추천", "스팀다리미 추천", "침구청소기 추천",
  ],
  kitchen: [
    "전기밥솥 추천", "커피머신 추천", "전기포트 추천", "믹서기 추천", "전자레인지 추천",
    "인덕션 추천", "토스터 추천", "정수기 추천", "식기세척기 추천", "와플메이커 추천",
    "핸드블렌더 추천", "전기그릴 추천", "에어프라이어 오븐 추천", "냉장고 추천", "음식물처리기 추천",
  ],
};

(async () => {
  const { data: niches, error: nErr } = await db.from("niches").select("id, slug");
  if (nErr) throw nErr;
  const nicheId = Object.fromEntries(niches.map((n) => [n.slug, n.id]));

  const { data: existing, error: eErr } = await db.from("keywords").select("keyword");
  if (eErr) throw eErr;
  // Compare ignoring spaces so "무선 이어폰 추천" and "무선이어폰추천" count as the same
  const norm = (s) => s.replace(/\s+/g, "");
  const have = new Set(existing.map((k) => norm(k.keyword)));

  const rows = [];
  for (const [slug, list] of Object.entries(SEEDS)) {
    if (!nicheId[slug]) { console.warn(`niche not found: ${slug}`); continue; }
    for (const keyword of list) {
      if (have.has(norm(keyword))) { console.log(`skip (exists): ${keyword}`); continue; }
      have.add(norm(keyword));
      rows.push({ niche_id: nicheId[slug], keyword, source: "seed", status: "pending" });
    }
  }

  console.log(`\n${rows.length} keywords to insert:`);
  for (const [slug, id] of Object.entries(nicheId)) {
    console.log(`  ${slug}: ${rows.filter((r) => r.niche_id === id).length}`);
  }
  if (!APPLY) return console.log("\nDry run. Re-run with --apply to insert.");

  const { error } = await db.from("keywords").insert(rows);
  if (error) throw error;
  console.log("Inserted.");
})();

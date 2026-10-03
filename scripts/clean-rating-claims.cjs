// One-off cleanup: remove false "no rating/review" claims and the duplicated
// in-body comparison table from existing AI articles.
// Usage: node scripts/clean-rating-claims.cjs          (dry run)
//        node scripts/clean-rating-claims.cjs --apply  (write to DB)
require("dotenv").config({ path: ".env.local", quiet: true });
const { createClient } = require("@supabase/supabase-js");

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const APPLY = process.argv.includes("--apply");

// "(?<!차)별점" avoids matching "차별점"
const RATING = /평점|리뷰|(?<!차)별점|후기/;
const NEGATIVE = /없|부족|어려|알 수 없|불확실|확신/;

function isClaim(text) {
  return RATING.test(text) && NEGATIVE.test(text);
}

// Remove rating clauses from a mixed line; returns null if nothing meaningful remains
function cleanLine(line) {
  if (!isClaim(line)) return line;
  const m = line.match(/^(\s*(?:[-*]|\d+\.)\s*(?:\*\*[^*]+\*\*:\s*)?)(.*)$/);
  if (!m) return null;
  const [, prefix, body] = m;
  // e.g. "- **평점 및 리뷰**: 아직 없음" — the label itself is about ratings
  if (RATING.test(prefix)) return null;
  const kept = body
    .split(/,\s*/)
    .filter((clause) => !RATING.test(clause))
    .map((c) => c.trim())
    .filter(Boolean);
  if (kept.length === 0 || kept.join("").length < 3) return null;
  let text = kept.join(", ").replace(/높으며$/, "높습니다.").replace(/며$/, "");
  return prefix + text;
}

function removeComparisonTable(md) {
  const lines = md.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,6}\s.*비교표/.test(lines[i])) {
      // skip heading, blank lines and the table that follows
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === "") j++;
      if (j < lines.length && lines[j].trim().startsWith("|")) {
        while (j < lines.length && lines[j].trim().startsWith("|")) j++;
        while (j < lines.length && lines[j].trim() === "") j++;
        i = j - 1;
        continue;
      }
    }
    out.push(lines[i]);
  }
  return out.join("\n");
}

function cleanArticle(md) {
  let lines = removeComparisonTable(md).split("\n");
  lines = lines.map((l) => (l.trim().startsWith("|") ? l : cleanLine(l))).filter((l) => l !== null);

  // Drop "단점" labels left with no content (e.g. "- **단점**:" whose sub-items were all removed)
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*(?:[-*]\s*)?\*\*단점\*\*:?\s*$/.test(l)) {
      const indent = l.match(/^\s*/)[0].length;
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === "") j++;
      const next = lines[j] || "";
      const nextIndent = next.match(/^\s*/)[0].length;
      const hasChild = /^\s*[-*]\s/.test(next) && (nextIndent > indent || !/^\s*[-*]\s*\*\*/.test(next));
      if (!hasChild) continue;
    }
    result.push(l);
  }
  return result.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

(async () => {
  const { data, error } = await db.from("articles").select("id, slug, content_markdown");
  if (error) throw error;
  let changed = 0;
  for (const a of data) {
    const cleaned = cleanArticle(a.content_markdown);
    if (cleaned === a.content_markdown) continue;
    changed++;
    const before = a.content_markdown.split("\n");
    const after = new Set(cleaned.split("\n"));
    const removed = before.filter((l) => l.trim() && !after.has(l));
    if (!APPLY) {
      console.log(`\n=== ${a.slug}  (-${removed.length} lines)`);
      removed.filter((l) => !l.trim().startsWith("|")).forEach((l) => console.log("  - " + l.slice(0, 110)));
    } else {
      const { error: upErr } = await db
        .from("articles")
        .update({ content_markdown: cleaned, updated_at: new Date().toISOString() })
        .eq("id", a.id);
      if (upErr) console.error(`Failed ${a.slug}:`, upErr.message);
    }
    const leftover = cleaned.split("\n").filter((l) => isClaim(l));
    if (leftover.length) console.log(`  !! leftover in ${a.slug}:`, leftover);
  }
  console.log(`\n${APPLY ? "Updated" : "Would update"} ${changed}/${data.length} articles.`);
})();

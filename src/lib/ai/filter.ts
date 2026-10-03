const PROHIBITED_WORDS = [
  "사용해봤",
  "실제로 써봤",
  "경험상",
  "체감상",
  "직접 사용해보니",
  "제가 써본",
  "사용해 본",
];

// 데이터가 없는 평점/리뷰를 상품의 단점처럼 서술하는 문장 ("차별점"은 제외)
const RATING_PATTERN = /평점|리뷰|(?<!차)별점|후기/;
const MISSING_PATTERN = /없|부족|어려|알 수 없|불확실/;

function isProhibitedSentence(sentence: string): boolean {
  if (PROHIBITED_WORDS.some((word) => sentence.includes(word))) return true;
  return RATING_PATTERN.test(sentence) && MISSING_PATTERN.test(sentence);
}

/**
 * 생성된 텍스트에서 금지 표현이 포함된 문장을 제거
 * (문자열 치환은 "[객관적 데이터 기반]" 같은 어색한 문구를 남기므로 문장 단위로 삭제)
 */
export function filterProhibitedText(text: string): string {
  let removed = 0;

  const lines = text.split("\n").flatMap((line) => {
    // 표/제목/이미지 줄은 문장 분리 대상에서 제외
    if (/^\s*(\||#|!\[)/.test(line) || !isProhibitedSentence(line)) return [line];

    // 리스트 접두사(-, 1., **라벨**:)를 보존하고 본문을 문장 단위로 필터링
    const m = line.match(/^(\s*(?:[-*]|\d+\.)\s*(?:\*\*[^*]+\*\*:\s*)?)?(.*)$/);
    const prefix = m?.[1] ?? "";
    const body = m?.[2] ?? line;
    if (RATING_PATTERN.test(prefix) && MISSING_PATTERN.test(body)) {
      removed++;
      return [];
    }

    const sentences = body.split(/(?<=[.!?。])\s+/);
    const kept = sentences.filter((s) => !isProhibitedSentence(s));
    removed += sentences.length - kept.length;
    if (kept.length === 0) return [];
    return [prefix + kept.join(" ")];
  });

  if (removed > 0) {
    console.log(`[AI Filter] Removed ${removed} sentence(s) containing prohibited expressions.`);
  }

  return lines.join("\n");
}

const PROHIBITED_WORDS = [
  "사용해봤",
  "실제로 써봤",
  "경험상",
  "체감상",
  "직접 사용해보니",
  "제가 써본",
  "사용해 본",
];

const REPLACEMENT = "[객관적 데이터 기반]";

/**
 * 생성된 텍스트에서 금지 표현을 필터링 및 치환
 */
export function filterProhibitedText(text: string): string {
  let filteredText = text;
  let hasFiltered = false;

  for (const word of PROHIBITED_WORDS) {
    if (filteredText.includes(word)) {
      // 모든 발생 치환
      const regex = new RegExp(word, "g");
      filteredText = filteredText.replace(regex, REPLACEMENT);
      hasFiltered = true;
      console.log(`[AI Filter] Replaced prohibited word: "${word}"`);
    }
  }

  if (hasFiltered) {
    console.log(`[AI Filter] Text was modified to remove prohibited expressions.`);
  }

  return filteredText;
}

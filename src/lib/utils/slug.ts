export function generateSlug(text: string): string {
  // 간단한 한글 및 영어 슬러그 생성 로직
  // 1. 소문자로 변환 (영어의 경우)
  // 2. 특수문자 제거 (한글, 영어, 숫자, 공백만 허용)
  // 3. 공백을 하이픈(-)으로 변경
  // 4. 연속된 하이픈 단일화
  return text
    .toLowerCase()
    .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

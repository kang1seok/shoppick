import { SYSTEM_PROMPT, ARTICLE_TEMPLATE, META_TEMPLATE } from "./prompts";
import { filterProhibitedText } from "./filter";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
export const MODEL = "gpt-4o";
export const PROMPT_VERSION = "v1.1"; // v1.1: 본문 비교표 제거, 평점/리뷰 미언급

export interface ProductData {
  productId: string;
  productName: string;
  price: number;
  rating: number | null;
  reviewCount: number | null;
  isRocket: boolean;
  imageUrl: string;
  productUrl: string;
}

export interface GeneratedArticle {
  title: string;
  content_markdown: string;
  meta_description: string;
  prompt_version: string;
}

/**
 * OpenAI API 호출 래퍼
 */
async function callOpenAI(
  messages: { role: string; content: string }[],
  options: { temperature?: number; json?: boolean } = {}
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: options.temperature ?? 0.3,
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API Error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content;
}

/**
 * 키워드와 상품 데이터를 기반으로 AI 글 및 메타데이터 생성
 */
export async function generateArticle(
  keyword: string,
  products: ProductData[]
): Promise<GeneratedArticle> {
  console.log(`[AI Generator] Starting article generation for keyword: ${keyword}`);

  // 값이 없는 항목(평점/리뷰 null)은 AI에 전달하지 않음 → "평점 0" 같은 잘못된 서술 방지
  const productInfoText = products
    .map((p, i) => {
      const lines = [
        `${i + 1}. [${p.productName}]`,
        `- 이미지URL: ${p.imageUrl}`,
        `- 가격: ${p.price.toLocaleString()}원`,
      ];
      if (p.rating !== null) lines.push(`- 평점: ${p.rating}`);
      if (p.reviewCount !== null) lines.push(`- 리뷰 수: ${p.reviewCount}`);
      lines.push(`- 로켓배송: ${p.isRocket ? "O" : "X"}`);
      return lines.join("\n");
    })
    .join("\n\n");

  const userMessage = `키워드: "${keyword}"\n\n상품 데이터:\n${productInfoText}\n\n위 데이터를 바탕으로 다음 템플릿에 맞춰 글을 작성해줘.\n\n${ARTICLE_TEMPLATE}`;

  const metaMessage = `키워드: "${keyword}"\n본문 요약용 상품 데이터:\n${productInfoText}\n\n${META_TEMPLATE}`;

  // 본문과 메타는 서로 독립적이므로 병렬 호출 (서버리스 타임아웃 단축)
  const [rawContent, metaContent] = await Promise.all([
    callOpenAI([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ]),
    callOpenAI(
      [
        { role: "system", content: "You are an SEO expert. Respond only with a JSON object." },
        { role: "user", content: metaMessage },
      ],
      { json: true }
    ),
  ]);

  // 금지 표현 필터링
  const contentMarkdown = filterProhibitedText(rawContent);

  let title = `${keyword} 추천 TOP 5`;
  let meta_description = "";

  try {
    const metaJson = JSON.parse(metaContent) as { title?: string; meta_description?: string };
    if (metaJson.title) title = metaJson.title;
    if (metaJson.meta_description) meta_description = metaJson.meta_description;
  } catch (error) {
    console.warn("[AI Generator] Failed to parse meta JSON, using fallbacks.", error);
  }

  console.log(`[AI Generator] Completed generation for keyword: ${keyword}`);

  return {
    title,
    content_markdown: contentMarkdown,
    meta_description,
    prompt_version: PROMPT_VERSION,
  };
}

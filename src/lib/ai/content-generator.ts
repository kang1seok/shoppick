import { SYSTEM_PROMPT, ARTICLE_TEMPLATE, META_TEMPLATE } from "./prompts";
import { filterProhibitedText } from "./filter";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const MODEL = "gpt-4o";

export interface ProductData {
  productId: string;
  productName: string;
  price: number;
  rating: number;
  reviewCount: number;
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
async function callOpenAI(messages: { role: string; content: string }[], temperature: number = 0.3) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
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
  const promptVersion = "v1.0";

  const productInfoText = products
    .map(
      (p, i) =>
        `${i + 1}. [${p.productName}]\n- 이미지URL: ${p.imageUrl}\n- 가격: ${p.price}원\n- 평점: ${p.rating} / 리뷰 수: ${p.reviewCount}\n- 로켓배송: ${p.isRocket ? "O" : "X"}`
    )
    .join("\n\n");

  const userMessage = `키워드: "${keyword}"\n\n상품 데이터:\n${productInfoText}\n\n위 데이터를 바탕으로 다음 템플릿에 맞춰 글을 작성해줘.\n\n${ARTICLE_TEMPLATE}`;

  // 1. 본문 생성
  let contentMarkdown = await callOpenAI([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ]);

  // 금지 표현 필터링
  contentMarkdown = filterProhibitedText(contentMarkdown);

  // 2. 메타 태그 생성
  const metaMessage = `키워드: "${keyword}"\n본문 요약용 상품 데이터:\n${productInfoText}\n\n${META_TEMPLATE}`;
  
  const metaContent = await callOpenAI([
    { role: "system", content: "You are an SEO expert." },
    { role: "user", content: metaMessage },
  ]);

  let title = `${keyword} 추천 TOP 5`;
  let meta_description = "";

  try {
    // OpenAI 응답이 마크다운 json 블록으로 감싸져 있을 수 있으므로 처리
    const cleanedMeta = metaContent.replace(/```json/g, "").replace(/```/g, "").trim();
    const metaJson = JSON.parse(cleanedMeta);
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
    prompt_version: promptVersion,
  };
}

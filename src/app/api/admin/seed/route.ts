import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // 실제 프로덕션에서는 관리자 권한 검증이 필수입니다.
  // 여기서는 MVP 테스트를 위해 허용합니다.

  try {
    // 1. 카테고리(Niches) 삽입
    const niches = [
      { name: "디지털/가전", slug: "digital", description: "최신 전자기기 및 가전제품 리뷰" },
      { name: "생활가전", slug: "home-appliances", description: "청소기, 세탁기 등 생활 가전" },
      { name: "주방가전", slug: "kitchen", description: "에어프라이어, 커피머신 등 주방 가전" },
    ];

    for (const niche of niches) {
      const { error } = await supabaseAdmin.from("niches").upsert(niche, { onConflict: "slug" });
      if (error) console.error("Error inserting niche:", error);
    }

    // 삽입된 카테고리 ID 가져오기
    const { data: insertedNiches } = await supabaseAdmin.from("niches").select("id, slug");
    const getCategoryId = (slug: string) => insertedNiches?.find(n => n.slug === slug)?.id;

    // 2. 초기 Seed 키워드 삽입
    const keywords = [
      { niche_id: getCategoryId("home-appliances"), keyword: "로봇청소기 추천", source: "seed", status: "selected" },
      { niche_id: getCategoryId("kitchen"), keyword: "에어프라이어 가성비", source: "seed", status: "selected" },
      { niche_id: getCategoryId("digital"), keyword: "무선이어폰 비교", source: "seed", status: "pending" },
    ];

    for (const kw of keywords) {
      if (!kw.niche_id) continue;
      
      // 중복 체크
      const { data: existing } = await supabaseAdmin.from("keywords").select("id").eq("keyword", kw.keyword).single();
      
      if (!existing) {
        await supabaseAdmin.from("keywords").insert(kw);
      }
    }

    return NextResponse.json({ success: true, message: "Seed data inserted successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

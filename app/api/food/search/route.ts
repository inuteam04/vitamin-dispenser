// app/api/food/search/route.ts
// 공공데이터 API 프록시 (CORS 우회)

import { NextRequest, NextResponse } from "next/server";

const API_URL =
  "http://api.data.go.kr/openapi/tn_pubr_public_nutri_process_info_api";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const limit = searchParams.get("limit") || "100";

  // 환경변수에서 API 키 가져오기 (서버 사이드이므로 NEXT_PUBLIC_ 없이도 가능)
  const serviceKey =
    process.env.FOOD_API_KEY || process.env.NEXT_PUBLIC_FOOD_API_KEY;

  if (!serviceKey) {
    return NextResponse.json(
      { error: "API 키가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  if (!query.trim()) {
    return NextResponse.json({ items: [] });
  }

  try {
    const params = new URLSearchParams({
      serviceKey,
      foodNm: query,
      type: "json",
      numOfRows: limit,
    });

    const fullUrl = `${API_URL}?${params.toString()}`;
    console.log(
      "[Food API] Fetching:",
      fullUrl.replace(serviceKey, "***KEY***")
    );

    const res = await fetch(fullUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`API 요청 실패: ${res.status}`);
    }

    const data = await res.json();

    // 응답 구조 확인
    if (data.response?.header?.resultCode === "00") {
      return NextResponse.json({
        items: data.response.body?.items || [],
        totalCount: data.response.body?.totalCount || 0,
      });
    }

    // 결과 없음 (03)
    if (data.response?.header?.resultCode === "03") {
      return NextResponse.json({ items: [], totalCount: 0 });
    }

    // 기타 오류
    return NextResponse.json(
      {
        error: data.response?.header?.resultMsg || "API 오류",
        code: data.response?.header?.resultCode,
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Food API Proxy Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류" },
      { status: 500 }
    );
  }
}

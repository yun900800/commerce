import { NextRequest, NextResponse } from "next/server";
import { getFilings } from "@/lib/sec-edgar";
import type { FilingSearchParams } from "@/types/sec";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cik = searchParams.get("cik");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const typesParam = searchParams.get("types");

    if (!cik || cik.trim() === "") {
      return NextResponse.json(
        { error: "Query parameter 'cik' is required" },
        { status: 400 }
      );
    }

    const params: FilingSearchParams = {
      cik: cik.trim(),
      from: from || undefined,
      to: to || undefined,
      types: typesParam
        ? typesParam.split(",").map((t) => t.trim()).filter(Boolean)
        : undefined,
    };

    const filings = await getFilings(params);

    return NextResponse.json(filings, {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("Filings API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch filings",
      },
      { status: 500 }
    );
  }
}

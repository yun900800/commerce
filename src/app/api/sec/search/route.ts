import { NextRequest } from "next/server";
import { searchStocks } from "@/lib/sec-edgar";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.trim() === "") {
    return Response.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  const results = await searchStocks(query.trim());

  return Response.json(results, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=60",
    },
  });
}

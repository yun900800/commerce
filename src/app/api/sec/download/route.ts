import { NextRequest } from "next/server";
import { getFilingDownloadUrl } from "@/lib/sec-edgar";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cik = searchParams.get("cik");
    const accession = searchParams.get("accession");
    const doc = searchParams.get("doc");

    if (!cik || !accession || !doc) {
      return Response.json(
        { error: "Missing required parameters: cik, accession, doc" },
        { status: 400 }
      );
    }

    const { url, filename } = getFilingDownloadUrl(cik, accession, doc);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "CommerceApp/1.0 admin@example.com",
        Accept: "*/*",
      },
    });

    if (!response.ok) {
      return Response.json(
        { error: `SEC upstream returned ${response.status}` },
        { status: 502 }
      );
    }

    // Forward the SEC's Content-Type — SEC correctly serves XHTML .xml files as text/html
    const upstreamContentType = response.headers.get("content-type") || "";

    // Fallback: map extension to content type (used only if upstream doesn't provide one)
    const fallbackTypes: Record<string, string> = {
      htm: "text/html",
      html: "text/html",
      txt: "text/plain",
      xml: "application/xml",
      pdf: "application/pdf",
    };
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const contentType = upstreamContentType || fallbackTypes[ext] || "application/octet-stream";

    // Stream the response back
    const body = await response.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": body.byteLength.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Download proxy error:", error);
    return Response.json(
      { error: "Failed to download file from SEC" },
      { status: 502 }
    );
  }
}

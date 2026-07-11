import { NextRequest } from "next/server";
import { getFilingDownloadUrl } from "@/lib/sec-edgar";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cik = searchParams.get("cik");
    const accession = searchParams.get("accession");
    const doc = searchParams.get("doc");
    const translate = searchParams.get("translate") === "1";

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

    const upstreamContentType = response.headers.get("content-type") || "";
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const fallbackTypes: Record<string, string> = {
      htm: "text/html",
      html: "text/html",
      txt: "text/plain",
      xml: "application/xml",
      pdf: "application/pdf",
    };
    const contentType = upstreamContentType || fallbackTypes[ext] || "application/octet-stream";

    // For non-HTML content (PDF, images, etc.), return as-is
    if (!contentType.includes("text/html") && !contentType.includes("application/xml")) {
      const body = await response.arrayBuffer();
      return new Response(body, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": body.byteLength.toString(),
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // For HTML content, optionally inject translate widget
    let html = await response.text();

    if (translate && (contentType.includes("text/html") || contentType.includes("application/xml"))) {
      // Inject Google Translate widget before </body>
      const translateWidget = `
<div id="google_translate_element" style="position:fixed;top:10px;right:10px;z-index:9999;background:white;padding:8px 12px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.15);font-size:13px;border:1px solid #e5e7eb;"></div>
<script>
function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    pageLanguage: 'en',
    includedLanguages: 'zh-CN,zh-TW,ja,ko',
    layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
    autoDisplay: false
  }, 'google_translate_element');
}
<\/script>
<script src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"><\/script>
`;
      if (html.includes("</body>")) {
        html = html.replace("</body>", translateWidget + "\n</body>");
      } else {
        html += translateWidget;
      }

      // Also add a top bar with instructions
      const topBar = `
<div style="position:fixed;top:0;left:0;right:0;z-index:9998;background:#059669;color:white;text-align:center;padding:6px;font-size:13px;font-family:sans-serif;">
  🌐 已启用 Google 翻译 — 在上方下拉菜单中选择"中文"即可查看翻译
  <button onclick="this.parentElement.style.display='none'" style="margin-left:16px;background:rgba(255,255,255,0.2);border:none;color:white;padding:2px 10px;border-radius:4px;cursor:pointer;">✕</button>
</div>
`;
      if (html.includes("<body")) {
        // Insert after <body> tag (handle potential attributes)
        html = html.replace(/<body([^>]*)>/i, (match) => {
          return `${match}\n${topBar}`;
        });
      }

      // Add padding-top to body to account for the fixed top bar
      html = html.replace(/<body([^>]*)>/i, (match) => {
        const hasStyle = match.includes("style=");
        if (hasStyle) {
          return match.replace(/style="([^"]*)"/i, (_, styles) => {
            return `style="padding-top:36px;${styles}"`;
          });
        }
        return `<body style="padding-top:36px"`;
      });
    }

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("View proxy error:", error);
    return Response.json(
      { error: "Failed to view file from SEC" },
      { status: 502 }
    );
  }
}

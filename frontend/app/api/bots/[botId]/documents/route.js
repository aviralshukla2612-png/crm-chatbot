import { NextResponse } from "next/server";
import { documentsStore } from "@/lib/db/documentsStore";

export async function GET(request, { params }) {
  const { botId } = await params;
  const docs = documentsStore.getDocuments(botId);
  return NextResponse.json({ documents: docs });
}

export async function POST(request, { params }) {
  const { botId } = await params;
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { name, content, type } = body;
      if (!content || !content.trim()) {
        return NextResponse.json({ error: "Document content cannot be empty" }, { status: 400 });
      }
      const doc = documentsStore.addDocument({
        botId,
        name: name || "Healthcare Knowledge Document",
        content,
        type: type || "PDF",
      });
      return NextResponse.json({ success: true, document: doc });
    }

    // FormData upload
    const formData = await request.formData();
    const file = formData.get("file");
    const manualContent = formData.get("content");

    let textContent = manualContent || "";
    let fileName = file?.name || "Uploaded Document";

    if (file && typeof file.text === "function") {
      try {
        const extracted = await file.text();
        if (extracted && extracted.trim()) {
          textContent = extracted;
        }
      } catch (e) {}
    }

    if (!textContent || !textContent.trim()) {
      return NextResponse.json(
        { error: "Could not read text content from document. Please provide text or PDF content." },
        { status: 400 }
      );
    }

    const doc = documentsStore.addDocument({
      botId,
      name: fileName,
      content: textContent,
      type: fileName.split(".").pop()?.toUpperCase() || "PDF",
    });

    return NextResponse.json({ success: true, document: doc });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

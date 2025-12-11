// app/api/upload-pdf-ocr/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/db";
import Note from "@/models/Note";

export const runtime = "nodejs";
export const maxDuration = 30;

// ---- helper: get user id from JWT in Authorization header ----
function getUserIdFromRequest(req) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId; // same as in your other APIs
  } catch {
    return null;
  }
}

export async function POST(req) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const apiKey = process.env.OCR_SPACE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "OCR API key not configured on server" },
        { status: 500 }
      );
    }

    await connectDB();

    const formData = await req.formData();
    const file = formData.get("file");
    const title = formData.get("title") || "";

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, message: "No PDF file received" },
        { status: 400 }
      );
    }

    // Read file into buffer and Blob
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });

    // ---------- CALL OCR.SPACE ----------
    const ocrForm = new FormData();
    ocrForm.append("apikey", apiKey);
    ocrForm.append("file", blob, file.name);
    ocrForm.append("filetype", "PDF");
    ocrForm.append("language", "eng");
    ocrForm.append("isOverlayRequired", "false");
    ocrForm.append("OCREngine", "2");

    const ocrRes = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: ocrForm,
    });

    // 👇 IMPORTANT: first read as text, THEN JSON.parse in try/catch
    const raw = await ocrRes.text();
    let ocrData;
    try {
      ocrData = JSON.parse(raw);
    } catch (parseErr) {
      console.error("OCR service returned non-JSON response:", raw);
      throw new Error("OCR service returned an invalid response");
    }

    console.log("OCR response (parsed):", JSON.stringify(ocrData, null, 2));

    // ---------- HANDLE OCR ERRORS GRACEFULLY ----------
    let parsedText = "";
    if (
      Array.isArray(ocrData?.ParsedResults) &&
      ocrData.ParsedResults.length > 0
    ) {
      parsedText = (ocrData.ParsedResults[0].ParsedText || "").trim();
    }

    const isErrored = ocrData?.IsErroredOnProcessing;
    const errorMsgRaw =
      (Array.isArray(ocrData?.ErrorMessage)
        ? ocrData.ErrorMessage[0]
        : ocrData?.ErrorMessage) || "";

    // If OCR engine says error OR text is almost empty → fallback note
    if (isErrored || !parsedText || parsedText.length < 20) {
      console.error("OCR failed or too little text:", errorMsgRaw);

      const content =
        `This note was created from the PDF file "${file.name}".\n\n` +
        "The online OCR service could not read much text from this PDF. " +
        "It might be scanned, low-quality, or formatted in a way that is hard to read automatically.\n\n" +
        "You can now type or paste your own notes here for this PDF.";

      const note = await Note.create({
        userId,
        title: title || file.name.replace(/\.pdf$/i, "") || "PDF note",
        content,
      });

      return NextResponse.json(
        {
          success: true,
          note,
          warning:
            "OCR could not extract clear text from this PDF. A placeholder note was created instead.",
        },
        { status: 200 }
      );
    }

    // ---------- NORMAL CASE: OCR GAVE US TEXT ----------
    const MAX_CHARS = 12000;
    const trimmedText =
      parsedText.length > MAX_CHARS
        ? parsedText.slice(0, MAX_CHARS) +
          "\n\n(Truncated because the PDF was very long.)"
        : parsedText;

    const note = await Note.create({
      userId,
      title: title || file.name.replace(/\.pdf$/i, "") || "PDF note",
      content: trimmedText,
    });

    return NextResponse.json(
      {
        success: true,
        note,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Upload PDF OCR route error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Server error while processing PDF.",
      },
      { status: 500 }
    );
  }
}

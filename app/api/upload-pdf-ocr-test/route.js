// app/api/upload-pdf-ocr-test/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";
export const maxDuration = 30;

function getUserIdFromRequest(req) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId;
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

    const formData = await req.formData();
    const file = formData.get("file");
    const title = formData.get("title") || "";

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, message: "No PDF file received" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });

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

    const raw = await ocrRes.text();
    let ocrData;
    try {
      ocrData = JSON.parse(raw);
    } catch (parseErr) {
      console.error("OCR service returned non-JSON response (test):", raw);
      throw new Error("OCR service returned an invalid response");
    }

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

    if (isErrored || !parsedText || parsedText.length < 20) {
      console.error("OCR (test) failed or too little text:", errorMsgRaw);
      return NextResponse.json(
        {
          success: false,
          message:
            "OCR could not extract clear text from this PDF. Please try another file or clearer scan.",
        },
        { status: 400 }
      );
    }

    const safeName =
      (typeof file.name === "string" && file.name) || "Uploaded PDF";

    return NextResponse.json(
      {
        success: true,
        text: parsedText,
        title: title || safeName.replace(/\.pdf$/i, "") || "PDF test",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Upload PDF OCR TEST route error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Server error while processing PDF for test.",
      },
      { status: 500 }
    );
  }
}



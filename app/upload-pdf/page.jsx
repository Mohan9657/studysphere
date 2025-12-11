"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadPdfPage() {
  const router = useRouter();

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [createdNote, setCreatedNote] = useState(null);

  const getToken = () =>
    typeof window !== "undefined"
      ? localStorage.getItem("studysphere_token")
      : "";

  // mode = "notes" | "test"
  const handleUpload = async (mode) => {
    setError("");
    setSuccessMsg("");
    setCreatedNote(null);

    if (!file) {
      setError("Please choose a PDF file.");
      return;
    }

    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    if (title.trim()) {
      formData.append("title", title.trim());
    }

    try {
      setUploading(true);

      if (mode === "notes") {
        // ---------- NORMAL NOTES FLOW (creates a note) ----------
        const res = await fetch("/api/upload-pdf-ocr", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(
            data.message ||
              "Failed to read this PDF. Try another file or clearer scan."
          );
          return;
        }

        setSuccessMsg("Notes extracted from PDF successfully using OCR!");
        setCreatedNote(data.note || null);
      } else {
        // ---------- TEST-ONLY FLOW (NO note saved) ----------
        // You need an API route: app/api/upload-pdf-ocr-test/route.js
        // That route should:
        //  1) OCR the uploaded PDF (same as upload-pdf-ocr)
        //  2) NOT save Note to DB
        //  3) return: { success: true, text }
        const res = await fetch("/api/upload-pdf-ocr-test", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await res.json();

        if (!res.ok || !data.success || !data.text) {
          setError(
            data.message ||
              "Failed to read this PDF for test. Try another file or clearer scan."
          );
          return;
        }

        // Save OCR text temporarily in sessionStorage
        if (typeof window !== "undefined") {
          sessionStorage.setItem("studysphere_pdf_test_text", data.text);
          sessionStorage.setItem(
            "studysphere_pdf_test_title",
            title.trim() || file.name || "PDF test"
          );
        }

        // Go to Take Test page in "PDF mode"
        router.push("/test?fromPdf=1");
      }
    } catch (err) {
      console.error(err);
      setError("Server error while uploading/reading PDF.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Upload PDF (OCR)</h1>
            <p className="text-xs text-slate-400 mt-1">
              Upload a PDF (slides, textbook, etc.). We&apos;ll use OCR to read
              the text. You can turn it into notes or generate a test directly.
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Tip: Works best with clear, text-based PDFs. Very blurry or
              handwritten scans may fail.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-xs px-3 py-1 rounded-lg border border-slate-600 hover:bg-slate-800"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Error / success messages */}
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/40 px-4 py-2 text-xs text-red-200">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/40 px-4 py-2 text-xs text-emerald-200">
            {successMsg}
          </div>
        )}

        {/* Upload panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-300">
              Choose PDF file <span className="text-red-400">*</span>
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
              }}
              className="block w-full text-sm text-slate-200 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-slate-700 file:text-xs file:font-semibold hover:file:bg-slate-600"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">Optional note title</label>
            <input
              type="text"
              placeholder="If empty, we’ll use the PDF file name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleUpload("notes")}
              disabled={uploading || !file}
              className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-sm font-semibold disabled:opacity-60"
            >
              {uploading
                ? "Uploading & extracting..."
                : "Upload & Generate Notes (OCR)"}
            </button>

            <button
              type="button"
              onClick={() => handleUpload("test")}
              disabled={uploading || !file}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-sm font-semibold disabled:opacity-60"
            >
              {uploading ? "Uploading..." : "Upload & Generate Test (OCR)"}
            </button>
          </div>
        </div>

        {/* Preview only for NOTES flow */}
        {createdNote && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 text-sm">
            <p className="text-xs text-slate-400">Created note</p>
            <p className="font-semibold">
              {createdNote.title || "Untitled note"}
            </p>
            <p className="text-xs text-slate-400 line-clamp-6 whitespace-pre-wrap">
              {createdNote.content}
            </p>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => router.push("/notes")}
                className="px-3 py-1 rounded-lg border border-slate-600 text-xs hover:bg-slate-800"
              >
                Go to notes
              </button>
              <button
                onClick={() => router.push(`/test?notes=${createdNote._id}`)}
                className="px-3 py-1 rounded-lg bg-emerald-500 text-xs font-semibold text-black hover:bg-emerald-400"
              >
                Generate test from this note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

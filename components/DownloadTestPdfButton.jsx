"use client";

import { useState } from "react";

export default function DownloadTestPdfButton({ summary, questions }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);

      // Load jsPDF only in browser
      const jsPDF = (await import("jspdf")).default;
      const doc = new jsPDF();

      // ---------- HEADER ----------
      doc.setFontSize(18);
      doc.text("StudySphere - Test Report", 14, 18);

      // ---------- SUMMARY ----------
      doc.setFontSize(11);
      let y = 28;

      const {
        testLabel = "",
        score,
        totalQuestions,
        accuracy,
        difficulty,
        timeUsedSeconds,
        dateString,
      } = summary || {};

      if (testLabel) {
        doc.text(`Test: ${testLabel}`, 14, y);
        y += 6;
      }

      if (dateString) {
        doc.text(`Date: ${dateString}`, 14, y);
        y += 6;
      }

      doc.text(`Difficulty: ${difficulty || "N/A"}`, 14, y);
      y += 6;

      doc.text(
        `Score: ${score ?? "-"} / ${totalQuestions ?? "-"}  (${accuracy ?? 0}%)`,
        14,
        y
      );
      y += 6;

      if (typeof timeUsedSeconds === "number") {
        const mins = Math.floor(timeUsedSeconds / 60);
        const secs = timeUsedSeconds % 60;
        doc.text(`Time used: ${mins}m ${secs}s`, 14, y);
        y += 6;
      }

      // separator line
      y += 4;
      doc.line(14, y, 196, y);
      y += 8;

      // ---------- QUESTIONS (BLOCK LAYOUT) ----------
      doc.setFontSize(11);

      const pageBottom = 280; // when to create a new page

      const ensureSpace = (needed = 10) => {
        if (y + needed > pageBottom) {
          doc.addPage();
          y = 20;
        }
      };

      (questions || []).forEach((q, index) => {
        const qNum = index + 1;
        const questionText = q.question || `Question ${qNum}`;

        const correctIndex =
          typeof q.correctOptionIndex === "number"
            ? q.correctOptionIndex
            : 0;
        const userIndex =
          typeof q.userOptionIndex === "number"
            ? q.userOptionIndex
            : -1;

        const correct =
          Array.isArray(q.options) && q.options[correctIndex]
            ? q.options[correctIndex]
            : "N/A";

        const user =
          userIndex >= 0 &&
          Array.isArray(q.options) &&
          q.options[userIndex]
            ? q.options[userIndex]
            : "Not answered";

        const aiExplanation = q.aiExplanation || "-";

        // Question line
        ensureSpace(12);
        doc.setFontSize(12);
        const qLines = doc.splitTextToSize(
          `Q${qNum}. ${questionText}`,
          180
        );
        doc.text(qLines, 14, y);
        y += qLines.length * 6;

        // Options
        if (Array.isArray(q.options) && q.options.length > 0) {
          doc.setFontSize(10);
          const optionLines = q.options.map(
            (opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`
          );
          optionLines.forEach((line) => {
            ensureSpace(6);
            doc.text(line, 18, y);
            y += 5;
          });
        }

        // Your answer
        ensureSpace(6);
        doc.setFontSize(10);
        const yourAnswerLines = doc.splitTextToSize(
          `Your answer: ${user}`,
          180
        );
        doc.text(yourAnswerLines, 14, y);
        y += yourAnswerLines.length * 5;

        // Correct answer
        ensureSpace(6);
        const correctLines = doc.splitTextToSize(
          `Correct answer: ${correct}`,
          180
        );
        doc.text(correctLines, 14, y);
        y += correctLines.length * 5;

        // AI explanation
        ensureSpace(12);
        const explLines = doc.splitTextToSize(
          `AI explanation: ${aiExplanation}`,
          180
        );
        doc.text(explLines, 14, y);
        y += explLines.length * 5;

        // separator between questions
        ensureSpace(8);
        y += 2;
        doc.line(14, y, 196, y);
        y += 6;
      });

      // ---------- SAVE ----------
      const filename = testLabel
        ? `studysphere-${testLabel.replace(/\s+/g, "-")}.pdf`
        : "studysphere-test.pdf";

      doc.save(filename);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Failed to generate PDF. Check console for details.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-sm font-semibold disabled:opacity-70"
    >
      {downloading ? "Generating PDF..." : "Download test as PDF"}
    </button>
  );
}

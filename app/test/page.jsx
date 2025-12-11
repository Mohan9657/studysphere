"use client";

export const dynamic = "force-dynamic"; 

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DownloadTestPdfButton from "@/components/DownloadTestPdfButton";

export default function TestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // initial selected note IDs from URL (if user came from notes page)
  const initialSelectedIds = (() => {
    const param = searchParams.get("notes");
    if (!param) return [];
    return param.split(",").filter(Boolean);
  })();

  // PDF mode?
  const fromPdf = searchParams.get("fromPdf") === "1";

  const [availableNotes, setAvailableNotes] = useState([]);
  const [selectedNoteIds, setSelectedNoteIds] = useState(initialSelectedIds);

  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState(5);
  const [customCount, setCustomCount] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  // Timer settings
  const [timerMode, setTimerMode] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(3); // user sets minutes
  const [timeLeft, setTimeLeft] = useState(0); // seconds
  const [totalTime, setTotalTime] = useState(0); // seconds
  const [halfAlertSent, setHalfAlertSent] = useState(false);
  const [last10AlertSent, setLast10AlertSent] = useState(false);

  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // result now includes detailed AI explanations
  const [result, setResult] = useState(null);

  // PDF text + title from sessionStorage (when fromPdf=1)
  const [pdfText, setPdfText] = useState("");
  const [pdfTitle, setPdfTitle] = useState("");

  const getToken = () =>
    typeof window !== "undefined"
      ? localStorage.getItem("studysphere_token")
      : "";

  // Helper: format seconds as MM:SS
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  // Load PDF text from sessionStorage if in PDF mode
  useEffect(() => {
    if (!fromPdf) return;
    if (typeof window === "undefined") return;

    const storedText = sessionStorage.getItem("studysphere_pdf_test_text");
    const storedTitle = sessionStorage.getItem("studysphere_pdf_test_title");

    if (!storedText) {
      setError(
        "No PDF text found. Please upload the PDF again from the Upload PDF page."
      );
      return;
    }

    setPdfText(storedText);
    setPdfTitle(storedTitle || "PDF-based test");
  }, [fromPdf]);

  // Fetch notes list so user can select which notes to use (normal mode only)
  useEffect(() => {
    if (fromPdf) return; // in PDF mode, we don't need notes

    const fetchNotes = async () => {
      try {
        const token = getToken();
        if (!token) {
          router.push("/login");
          return;
        }

        const res = await fetch("/api/notes", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.message || "Failed to load notes");
          return;
        }

        setAvailableNotes(data.notes || []);
      } catch (err) {
        console.error(err);
        setError("Unable to load notes");
      }
    };

    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromPdf]);

  // Timer logic + alerts
  useEffect(() => {
    if (timerMode && timeLeft > 0) {
      const id = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);

      // Half-time alert
      if (
        !halfAlertSent &&
        totalTime > 0 &&
        timeLeft === Math.floor(totalTime / 2)
      ) {
        alert("⚠️ Half time over!");
        setHalfAlertSent(true);
      }

      // Last 10 seconds alert
      if (!last10AlertSent && timeLeft === 10) {
        alert("⏰ Only 10 seconds left!");
        setLast10AlertSent(true);
      }

      return () => clearTimeout(id);
    }

    // Auto-submit when time hits 0 and quiz is active
    if (timerMode && timeLeft === 0 && questions.length > 0) {
      handleSubmitTest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    timerMode,
    timeLeft,
    questions.length,
    totalTime,
    halfAlertSent,
    last10AlertSent,
  ]);

  const toggleSelectNote = (id) => {
    setSelectedNoteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ---------- UPDATED: always trim questions to the requested count ----------
  const handleGenerate = async () => {
    try {
      setError("");
      setResult(null); // clear old result
      setQuestions([]);
      setAnswers([]);

      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      // In normal mode, user must select notes
      if (!fromPdf && selectedNoteIds.length === 0) {
        setError("Please select at least one note for this test.");
        return;
      }

      // In PDF mode, we MUST have OCR text
      if (fromPdf && !pdfText) {
        setError(
          "No PDF text available. Please go to Upload PDF and try again."
        );
        return;
      }

      setLoadingQuiz(true);

      const count = useCustom ? Number(customCount) : Number(questionCount);

      if (!count || count <= 0) {
        setError("Please choose a valid number of questions.");
        return;
      }

      let res;
      if (fromPdf) {
        // 🔹 Use OCR text → generate-test-from-text
        res = await fetch("/api/generate-test-from-text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            text: pdfText,
            difficulty,
            numQuestions: count,
          }),
        });
      } else {
        // 🔹 Normal notes-based test
        res = await fetch("/api/generate-test", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            difficulty,
            numQuestions: count,
            noteIds: selectedNoteIds,
            timerMode,
            timerMinutes: customMinutes === "" ? 1 : Number(customMinutes),
          }),
        });
      }

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Failed to generate test");
        return;
      }

      // 🔥 Force the number of questions to exactly `count`
      const desiredCount = count;
      const allQuestions = data.questions || [];
      const trimmedQuestions = allQuestions.slice(0, desiredCount);

      setQuestions(trimmedQuestions);
      setAnswers(new Array(trimmedQuestions.length).fill(null));

      // Set up timer if enabled
      if (timerMode) {
        const minutes = customMinutes === "" ? 1 : Number(customMinutes);
        const totalSeconds = minutes * 60;
        setTotalTime(totalSeconds);
        setTimeLeft(totalSeconds);
        setHalfAlertSent(false);
        setLast10AlertSent(false);
      } else {
        // no timer
        setTimeLeft(0);
        setTotalTime(0);
        setHalfAlertSent(false);
        setLast10AlertSent(false);
      }
    } catch (err) {
      console.error(err);
      setError("Error generating test");
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleAnswerChange = (qIndex, optIndex) => {
    setAnswers((prev) => {
      const copy = [...prev];
      copy[qIndex] = optIndex;
      return copy;
    });
  };

  const handleSubmitTest = async () => {
    try {
      setError("");

      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      if (!questions.length) {
        setError("No questions to submit.");
        return;
      }

      setSubmitting(true);

      // time used (only if timer mode)
      const timeUsedSeconds =
        timerMode && totalTime > 0 ? totalTime - timeLeft : null;

      const res = await fetch("/api/evaluate-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questions,
          userAnswers: answers,
          difficulty,
          timerMode,
          timeUsedSeconds,
          selectedNoteIds: fromPdf ? [] : selectedNoteIds,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Failed to evaluate test");
        return;
      }

      // Save result with AI explanations
      setResult({
        score: data.score,
        total: data.totalQuestions,
        accuracy: data.accuracy,
        xpEarned: data.xpEarned,
        perQuestionResults: data.perQuestionResults || [],
        testLabel: fromPdf ? pdfTitle : "Notes-based test",
        timeUsedSeconds: data.timeUsedSeconds ?? null,
        difficulty: data.difficulty,
      });

      // stop timer & alerts
      setTimerMode(false);
      setTimeLeft(0);
      setTotalTime(0);
      setHalfAlertSent(false);
      setLast10AlertSent(false);

      // clear questions so quiz UI hides
      setQuestions([]);
      setAnswers([]);
    } catch (err) {
      console.error(err);
      setError("Error submitting test");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-4 text-sm px-3 py-1 border border-slate-600 rounded-lg"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-bold mb-2">
          {fromPdf ? "Take Test (PDF Mode)" : "Take Test"}
        </h1>
        <p className="text-sm text-slate-300 mb-2">
          {fromPdf
            ? "We will generate questions from the PDF you uploaded. Choose difficulty, number of questions and quiz mode."
            : "Select which notes to use, then choose difficulty, number of questions, and quiz mode."}
        </p>

        {fromPdf && pdfTitle && (
          <p className="text-xs text-emerald-300 mb-2">
            Source PDF: <span className="font-semibold">{pdfTitle}</span>
          </p>
        )}

        {error && (
          <p className="mb-3 text-sm text-red-400 font-medium">{error}</p>
        )}

        {/* NOTE SELECTION – hidden in PDF mode */}
        {!fromPdf && (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">Select Notes for this Test</p>
              <p className="text-xs text-slate-400">
                Only selected notes will be used.
              </p>
            </div>

            {availableNotes.length === 0 ? (
              <p className="text-sm text-slate-400">
                No notes found. Please create notes first.
              </p>
            ) : (
              <>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-2">
                  {availableNotes.map((note) => (
                    <label
                      key={note._id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedNoteIds.includes(note._id)}
                        onChange={() => toggleSelectNote(note._id)}
                      />
                      <span className="truncate">
                        {note.title || "(Untitled note)"}
                      </span>
                    </label>
                  ))}
                </div>

                <p className="text-xs text-slate-400 mt-2">
                  Selected: {selectedNoteIds.length} note
                  {selectedNoteIds.length === 1 ? "" : "s"}
                </p>
              </>
            )}
          </div>
        )}

        {/* SETTINGS BOX */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 mb-6 space-y-5">
          {/* DIFFICULTY */}
          <div>
            <p className="text-sm mb-2">Difficulty</p>
            <div className="flex gap-2">
              {["easy", "medium", "hard"].map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                    difficulty === level
                      ? "bg-emerald-500 text-black border-emerald-500"
                      : "bg-slate-800 border-slate-600 hover:bg-slate-700"
                  }`}
                >
                  {level.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* QUESTION COUNT */}
          <div>
            <p className="text-sm mb-2">Number of Questions</p>

            <div className="flex gap-3 items-center">
              {!useCustom ? (
                <>
                  <select
                    className="bg-slate-800 p-2 rounded border border-slate-600"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(e.target.value)}
                  >
                    <option value="5">5 Questions</option>
                    <option value="10">10 Questions</option>
                    <option value="15">15 Questions</option>
                    <option value="20">20 Questions</option>
                  </select>

                  <button
                    onClick={() => setUseCustom(true)}
                    className="text-xs underline"
                  >
                    Custom
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="number"
                    className="bg-slate-800 p-2 w-24 rounded border border-slate-600"
                    value={customCount}
                    onChange={(e) => setCustomCount(e.target.value)}
                    placeholder="Count"
                  />
                  <button
                    onClick={() => {
                      setUseCustom(false);
                      setCustomCount("");
                    }}
                    className="text-xs underline"
                  >
                    Back
                  </button>
                </>
              )}
            </div>
          </div>

          {/* TIMER MODE */}
          <div>
            <p className="text-sm mb-1">Quiz Mode</p>
            <label className="flex items-center gap-2 text-sm mb-2">
              <input
                type="checkbox"
                checked={timerMode}
                onChange={() => setTimerMode(!timerMode)}
              />
              Timer-Based Quiz
            </label>

            {timerMode && (
              <>
                {/* Time selector: arrows + input box (minutes) */}
                <div className="flex items-center gap-3 text-xs text-slate-300 mb-1">
                  <span>Total time:</span>

                  <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-lg border border-slate-600">
                    <button
                      className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600"
                      onClick={() =>
                        setCustomMinutes((m) => {
                          const current = m === "" ? 1 : Number(m);
                          return Math.max(1, current - 1);
                        })
                      }
                    >
                      −
                    </button>

                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={customMinutes}
                      onChange={(e) => {
                        // allow typing digits; clamp 1–180
                        let val = e.target.value.replace(/\D/g, "");
                        if (val === "") {
                          setCustomMinutes("");
                          return;
                        }
                        let num = parseInt(val, 10);
                        if (isNaN(num)) num = 1;
                        if (num < 1) num = 1;
                        if (num > 180) num = 180;
                        setCustomMinutes(num);
                      }}
                      className="bg-slate-900 px-2 py-1 w-16 text-center rounded border border-slate-700 text-xs"
                    />

                    <button
                      className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600"
                      onClick={() =>
                        setCustomMinutes((m) => {
                          const current = m === "" ? 1 : Number(m);
                          return Math.min(180, current + 1);
                        })
                      }
                    >
                      +
                    </button>

                    <span>min</span>
                  </div>
                </div>

                <p className="text-xs text-emerald-400">
                  {timeLeft > 0
                    ? `Timer: ${formatTime(timeLeft)} remaining`
                    : `Timer will start after quiz is generated.`}
                </p>
              </>
            )}
          </div>

          {/* GENERATE BUTTON */}
          <button
            onClick={handleGenerate}
            disabled={loadingQuiz}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-60"
          >
            {loadingQuiz ? "Generating..." : "Generate Test"}
          </button>
        </div>

        {/* QUIZ PANEL */}
        {questions.length > 0 && (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-4">
            <h2 className="text-xl font-semibold mb-4">Quiz</h2>

            {timerMode && (
              <p className="text-sm mb-3 text-emerald-400">
                Time Left: {formatTime(timeLeft)}
              </p>
            )}

            <div className="space-y-5">
              {questions.map((q, qIndex) => (
                <div key={qIndex} className="border-b border-slate-800 pb-4">
                  <p className="text-sm font-medium mb-2">
                    Q{qIndex + 1}. {q.question}
                  </p>

                  <div className="space-y-2">
                    {q.options.map((opt, optIndex) => (
                      <label
                        key={optIndex}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={`q-${qIndex}`}
                          checked={answers[qIndex] === optIndex}
                          onChange={() =>
                            handleAnswerChange(qIndex, optIndex)
                          }
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSubmitTest}
                disabled={submitting}
                className="px-6 py-2 rounded-lg text-sm font-semibold bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-60"
              >
                {submitting ? "Checking..." : "Submit Test"}
              </button>
            </div>
          </div>
        )}

        {/* RESULT + AI EXPLANATIONS + DOWNLOAD PDF */}
        {result && (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
            <h2 className="text-xl font-semibold mb-3">Test Review</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 text-sm">
              <div>
                <p className="text-slate-400 text-xs">Score</p>
                <p className="text-lg font-semibold">
                  {result.score} / {result.total}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Accuracy</p>
                <p className="text-lg font-semibold">{result.accuracy}%</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">XP Earned</p>
                <p className="text-lg font-semibold">{result.xpEarned}</p>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4 gap-2">
              <p className="text-xs text-slate-400">
                Source:{" "}
                <span className="font-semibold">
                  {fromPdf ? pdfTitle : "Selected notes"}
                </span>
              </p>

              {/* PDF DOWNLOAD BUTTON */}
              <DownloadTestPdfButton
                summary={{
                  testLabel: result.testLabel || "StudySphere Test",
                  score: result.score,
                  totalQuestions: result.total,
                  accuracy: result.accuracy,
                  difficulty: result.difficulty,
                  timeUsedSeconds: result.timeUsedSeconds,
                  dateString: new Date().toLocaleString(),
                }}
                questions={result.perQuestionResults || []}
              />
            </div>

            <div className="mt-4 space-y-5">
              {result.perQuestionResults.map((q, idx) => (
                <div
                  key={idx}
                  className="border-b border-slate-800 pb-4 last:border-b-0"
                >
                  <p className="text-sm font-medium mb-2">
                    Q{idx + 1}. {q.question}
                  </p>

                  <div className="space-y-2">
                    {q.options.map((opt, optIndex) => {
                      const isCorrect = optIndex === q.correctOptionIndex;
                      const isUser = optIndex === q.userOptionIndex;

                      let border = "border-slate-700";
                      let bg = "bg-slate-900";

                      if (isCorrect) {
                        border = "border-emerald-500";
                        bg = "bg-emerald-500/10";
                      }
                      if (isUser && !isCorrect) {
                        border = "border-red-500";
                        bg = "bg-red-500/10";
                      }

                      return (
                        <div
                          key={optIndex}
                          className={`flex justify-between items-center px-3 py-1.5 rounded-lg border ${border} ${bg} text-xs md:text-sm`}
                        >
                          <span>{opt}</span>
                          <div className="flex gap-2 text-[0.7rem]">
                            {isUser && (
                              <span className="text-sky-300">Your choice</span>
                            )}
                            {isCorrect && (
                              <span className="text-emerald-300">Correct</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="mt-2 text-xs text-slate-300">
                    <span className="font-semibold">Your answer:</span>{" "}
                    {q.userOptionIndex != null && q.userOptionIndex >= 0
                      ? q.options[q.userOptionIndex] || "Not answered"
                      : "Not answered"}
                  </p>
                  <p className="text-xs text-emerald-300">
                    <span className="font-semibold">Correct answer:</span>{" "}
                    {q.options[q.correctOptionIndex] || "-"}
                  </p>

                  <p className="mt-2 text-xs text-slate-200">
                    <span className="font-semibold">AI explanation:</span>{" "}
                    {q.aiExplanation || "Explanation not available."}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setResult(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-600 text-xs hover:bg-slate-800"
              >
                Close Review
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

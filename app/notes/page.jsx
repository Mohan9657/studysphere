"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NotesPage() {
  const router = useRouter();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  // 3-dots menu
  const [openMenuId, setOpenMenuId] = useState(null);

  // select / merge / download
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [merging, setMerging] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const getToken = () =>
    typeof window !== "undefined"
      ? localStorage.getItem("studysphere_token")
      : "";

  // ---------- LOAD NOTES ----------
  useEffect(() => {
    const loadNotes = async () => {
      try {
        setLoading(true);
        setError("");

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

        setNotes(data.notes || []);
      } catch (err) {
        console.error(err);
        setError("Unable to load notes.");
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- HELPERS ----------
  const snippet = (text, max = 220) => {
    if (!text) return "";
    if (text.length <= max) return text;
    return text.slice(0, max) + "…";
  };

  const resetEditor = () => {
    setEditingNoteId(null);
    setTitle("");
    setContent("");
  };

  // ---------- OPEN / CLOSE EDITOR ----------
  const openNewNoteEditor = () => {
    resetEditor();
    setEditorOpen(true);
    setOpenMenuId(null);
  };

  const openEditNoteEditor = (note) => {
    setEditingNoteId(note._id);
    setTitle(note.title || "");
    setContent(note.content || "");
    setEditorOpen(true);
    setOpenMenuId(null);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    resetEditor();
  };

  // ---------- SAVE NOTE ----------
  const handleSaveNote = async () => {
    if (!title.trim() && !content.trim()) {
      alert("Please write something before saving.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const isEdit = !!editingNoteId;
      const url = isEdit ? `/api/notes/${editingNoteId}` : "/api/notes";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim() || "Untitled note",
          content,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Failed to save note");
        return;
      }

      if (isEdit) {
        setNotes((prev) =>
          prev.map((n) =>
            n._id === editingNoteId ? { ...n, ...data.note } : n
          )
        );
      } else {
        setNotes((prev) => [data.note, ...prev]);
      }

      closeEditor();
    } catch (err) {
      console.error(err);
      setError("Error while saving note.");
    } finally {
      setSaving(false);
    }
  };

  // ---------- DELETE ----------
  const handleDeleteNote = async (id) => {
    const sure = confirm("Delete this note?");
    if (!sure) return;

    try {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || "Failed to delete note");
        return;
      }

      setNotes((prev) => prev.filter((n) => n._id !== id));

      if (editingNoteId === id) closeEditor();
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    } catch (err) {
      console.error(err);
      alert("Error deleting note.");
    }
  };

  // ---------- SHARE AS .TXT (WEB SHARE API with file, fallback: download) ----------
  const handleShareNote = async (note) => {
    try {
      const fileName = `${(note.title || "note").replace(
        /[^\w\-]+/g,
        "_"
      )}.txt`;
      const fileContent = `${note.title || "Untitled note"}\n\n${
        note.content || ""
      }`;
      const blob = new Blob([fileContent], { type: "text/plain" });

      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [new File([blob], fileName)] })
      ) {
        const file = new File([blob], fileName, {
          type: "text/plain",
        });
        await navigator.share({
          title: note.title || "StudySphere note",
          text: "",
          files: [file],
        });
      } else {
        // fallback → simple download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Share failed:", err);
      alert("Unable to share this note on this device.");
    } finally {
      setOpenMenuId(null);
    }
  };

  // ---------- SELECT / MERGE / DOWNLOAD ----------
  const toggleSelectNote = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const handleStartSelectMode = (id) => {
    setSelectMode(true);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
    setOpenMenuId(null);
  };

  const handleCancelSelection = () => {
    setSelectMode(false);
    setSelectedIds([]);
  };

  const handleMergeSelected = async () => {
    if (selectedIds.length < 2) {
      alert("Select at least 2 notes to merge.");
      return;
    }

    try {
      setMerging(true);
      setError("");

      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const selectedNotes = notes.filter((n) =>
        selectedIds.includes(n._id)
      );

      const mergedTitle =
        "Merged: " +
        selectedNotes
          .map((n) => n.title || "Untitled")
          .slice(0, 3)
          .join(" + ");

      const mergedContent = selectedNotes
        .map(
          (n, idx) =>
            `### Part ${idx + 1}: ${n.title || "Untitled note"}\n\n${
              n.content || ""
            }`
        )
        .join("\n\n---\n\n");

      const res = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: mergedTitle,
          content: mergedContent,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Failed to merge notes");
        return;
      }

      setNotes((prev) => [data.note, ...prev]);
      setSelectMode(false);
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      setError("Error while merging notes.");
    } finally {
      setMerging(false);
    }
  };

  const handleDownloadSelected = () => {
    if (selectedIds.length === 0) return;

    try {
      setDownloading(true);
      const selectedNotes = notes.filter((n) =>
        selectedIds.includes(n._id)
      );

      selectedNotes.forEach((note) => {
        const fileName = `${(note.title || "note").replace(
          /[^\w\-]+/g,
          "_"
        )}.txt`;
        const content = `${note.title || "Untitled note"}\n\n${
          note.content || ""
        }`;
        const blob = new Blob([content], {
          type: "text/plain;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
    } catch (err) {
      console.error(err);
      alert("Error while downloading notes.");
    } finally {
      setDownloading(false);
    }
  };

  // ---------- FULL-SCREEN EDITOR UI ----------
  if (editorOpen) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">
                {editingNoteId ? "Edit note" : "New note"}
              </p>
              <h1 className="text-2xl font-semibold">
                {title.trim() || "Untitled note"}
              </h1>
            </div>

            <div className="flex gap-2">
              <button
                onClick={closeEditor}
                className="px-3 py-1.5 rounded-lg border border-slate-600 text-xs hover:bg-slate-800"
              >
                Back to notes
              </button>
              <button
                onClick={handleSaveNote}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-xs font-semibold disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save note"}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/40 px-4 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <input
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="w-full min-h-[650px] bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Write your notes here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  }

  // ---------- LIST VIEW UI ----------
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* header row with Back + New note */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 rounded-lg border border-slate-600 text-sm hover:bg-slate-800"
          >
            ← Back to dashboard
          </button>

          <div className="flex items-center gap-2">
            {selectMode && (
              <span className="text-xs text-slate-400">
                {selectedIds.length} selected
              </span>
            )}
            <button
              onClick={openNewNoteEditor}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-sm font-semibold"
            >
              + New note
            </button>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold">Your notes</h1>
          <p className="text-xs text-slate-400 mt-1">
            Create, edit and manage topic-wise notes to use in tests.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/40 px-4 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Loading notes…</p>
        ) : notes.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-sm text-slate-400">
            No notes yet. Click{" "}
            <span className="font-semibold">“+ New note”</span> to
            start writing.
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => {
              const isSelected = selectedIds.includes(note._id);
              return (
                <div
                  key={note._id}
                  className={`relative bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 hover:border-slate-600 transition ${
                    isSelected ? "ring-2 ring-emerald-400" : ""
                  }`}
                >
                  <div className="flex justify-between gap-3">
                    {/* LEFT: title + snippet */}
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() =>
                        !selectMode && openEditNoteEditor(note)
                      }
                    >
                      <p className="text-sm font-semibold mb-1">
                        {note.title || "Untitled note"}
                      </p>
                      <p className="text-xs text-slate-400 leading-snug">
                        {snippet(note.content)}
                      </p>
                    </div>

                    {/* RIGHT: checkbox + 3-dots */}
                    <div className="flex items-start gap-2">
                      {selectMode && (
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={isSelected}
                          onChange={() =>
                            toggleSelectNote(note._id)
                          }
                        />
                      )}

                      <div className="relative">
                        <button
                          onClick={() =>
                            setOpenMenuId((prev) =>
                              prev === note._id ? null : note._id
                            )
                          }
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-300 text-xl leading-none"
                        >
                          ⋯
                        </button>

                        {openMenuId === note._id && (
                          <div className="absolute right-0 mt-1 w-40 bg-slate-900 border border-slate-700 rounded-lg text-xs shadow-lg z-10">
                            <button
                              onClick={() =>
                                openEditNoteEditor(note)
                              }
                              className="w-full text-left px-3 py-2 hover:bg-slate-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleShareNote(note)}
                              className="w-full text-left px-3 py-2 hover:bg-slate-800"
                            >
                              Share (.txt)
                            </button>
                            <button
                              onClick={() =>
                                handleStartSelectMode(note._id)
                              }
                              className="w-full text-left px-3 py-2 hover:bg-slate-800"
                            >
                              Select
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteNote(note._id)
                              }
                              className="w-full text-left px-3 py-2 text-red-300 hover:bg-slate-800"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BOTTOM BAR FOR SELECT MODE */}
        {selectMode && (
          <div className="fixed bottom-4 left-0 right-0 flex justify-center pointer-events-none">
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-full px-4 py-2 shadow-lg pointer-events-auto">
              <span className="text-xs text-slate-300">
                {selectedIds.length} selected
              </span>
              <button
                onClick={handleMergeSelected}
                disabled={merging || selectedIds.length < 2}
                className="px-3 py-1 rounded-full bg-indigo-500 hover:bg-indigo-400 text-xs font-semibold disabled:opacity-50"
              >
                {merging ? "Merging..." : "Merge selected"}
              </button>
              <button
                onClick={handleDownloadSelected}
                disabled={
                  downloading || selectedIds.length === 0
                }
                className="px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-xs font-semibold text-black disabled:opacity-50"
              >
                {downloading
                  ? "Downloading..."
                  : "Download selected"}
              </button>
              <button
                onClick={handleCancelSelection}
                className="px-3 py-1 rounded-full border border-slate-600 text-xs hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

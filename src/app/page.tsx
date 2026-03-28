"use client";
import { useState } from "react";

export default function SkillSelectionPage() {
  const [skill, setSkill] = useState("");
  const [status, setStatus] = useState<
    "idle" | "researching" | "done" | "error"
  >("idle");
  const [docUrl, setDocUrl] = useState<string | null>(null);

  async function handleResearch() {
    if (!skill) return;
    setStatus("researching");
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill }),
      });
      const data = await res.json();
      if (data.docUrl) {
        setDocUrl(data.docUrl);
        setStatus("done");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">What do you want to learn?</h1>
      <input
        aria-label="Skill input"
        className="border rounded px-4 py-2 w-80 text-lg"
        placeholder="e.g. knife skills, juggling, golf swing"
        value={skill}
        onChange={(e) => setSkill(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleResearch()}
      />
      <button
        className="bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50"
        onClick={handleResearch}
        disabled={!skill || status === "researching"}
      >
        {status === "researching" ? "Researching..." : "Start Research"}
      </button>
      {status === "done" && docUrl && (
        <a href={docUrl} target="_blank" className="text-blue-500 underline">
          View Skill Document in Google Docs
        </a>
      )}
      {status === "error" && (
        <p className="text-red-500">Research failed. Check console.</p>
      )}
    </main>
  );
}

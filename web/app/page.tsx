"use client";

import { useCallback, useRef, useState } from "react";
import type { PdfProcessResult } from "@firecrawl/pdf-inspector-wasm";

let initPromise: Promise<unknown> | null = null;

function ensureWasmInit() {
  if (!initPromise) {
    initPromise = import("@firecrawl/pdf-inspector-wasm").then((mod) =>
      mod.default({ module_or_path: "/pdf_inspector_wasm_bg.wasm" }),
    );
  }
  return initPromise;
}

type Status = "idle" | "loading" | "done" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [markdown, setMarkdown] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setStatus("loading");
    setError("");
    setCopied(false);
    setFileName(file.name);

    try {
      await ensureWasmInit();
      const { processPdf } = await import("@firecrawl/pdf-inspector-wasm");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result: PdfProcessResult = processPdf(bytes);

      if (!result.markdown || !result.markdown.trim()) {
        setStatus("error");
        setError(
          result.pdfType === "Scanned" || result.pdfType === "ImageBased"
            ? "This PDF looks scanned or image-based, so there's no embedded text to extract (OCR isn't supported here)."
            : "No text could be extracted from this PDF.",
        );
        return;
      }

      setMarkdown(result.markdown);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to convert this PDF.");
    }
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const copyToClipboard = async () => {
    setCopyError("");
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = markdown;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (!ok) {
        setCopyError("Couldn't copy automatically — select the text above and copy manually.");
        setTimeout(() => setCopyError(""), 4000);
        return;
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMarkdown = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(/\.pdf$/i, "") + ".md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setStatus("idle");
    setMarkdown("");
    setError("");
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            PDF → Markdown for LLMs
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Upload a PDF and get clean Markdown back, ready to paste into a prompt.
            Everything runs locally in your browser — nothing is uploaded anywhere.
          </p>
        </div>

        {status !== "done" && (
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-white p-12 text-center transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-zinc-600"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={onInputChange}
            />
            {status === "loading" ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Converting {fileName}…
              </p>
            ) : (
              <>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Drop a PDF here, or click to choose a file
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500">PDF only</p>
              </>
            )}
          </div>
        )}

        {status === "error" && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            {error}
          </div>
        )}

        {status === "done" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {fileName}
              </p>
              <button
                onClick={reset}
                className="text-sm text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                Convert another
              </button>
            </div>

            <pre className="max-h-[28rem] overflow-auto rounded-lg border border-zinc-200 bg-white p-4 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
              {markdown}
            </pre>

            {copyError && (
              <p className="text-sm text-amber-700 dark:text-amber-400">{copyError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={copyToClipboard}
                className="flex h-10 flex-1 items-center justify-center rounded-full bg-foreground text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
              >
                {copied ? "Copied!" : "Copy to clipboard"}
              </button>
              <button
                onClick={downloadMarkdown}
                className="flex h-10 flex-1 items-center justify-center rounded-full border border-zinc-300 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Download .md
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

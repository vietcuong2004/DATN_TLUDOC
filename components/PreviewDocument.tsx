"use client";

import React, { useState, useEffect } from 'react';
import { Eye, X, Minus, Square, Copy, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface DocumentInfo {
  id?: number | string;
  title: string;
  image?: string;
  downloadUrl?: string;
  content?: React.ReactNode;
  file?: File;
}

interface PreviewDocumentProps {
  document: DocumentInfo | null;
  onClose: () => void;
}

export default function PreviewDocument({ document, onClose }: PreviewDocumentProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // States for local file processing
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [localPreviewText, setLocalPreviewText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!document?.file) {
      setLocalPreviewUrl(null);
      setLocalPreviewText("");
      setError("");
      return;
    }

    const file = document.file;
    const fileName = file.name.toLowerCase();
    const isDocx = file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || fileName.endsWith(".docx");
    const isPdf = file.type === "application/pdf" || fileName.endsWith(".pdf");

    if (isPdf) {
      const objectUrl = URL.createObjectURL(file);
      setLocalPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    if (isDocx) {
      const docxDataUrl = URL.createObjectURL(file);
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Xem trước tài liệu</title>
            <script src="https://unpkg.com/jszip/dist/jszip.min.js"></script>
            <script src="https://unpkg.com/docx-preview/dist/docx-preview.min.js"></script>
            <style>
                body { margin: 0; padding: 0; background: #e2e8f0; display: flex; flex-direction: column; align-items: center; overflow-y: auto; font-family: sans-serif; }
                #container { width: 100%; max-width: 900px; margin: 20px auto; }
                .loading { margin-top: 50px; text-align: center; color: #64748b; font-size: 15px; }
            </style>
        </head>
        <body>
            <div id="loading" class="loading">Đang tải và định dạng tài liệu...</div>
            <div id="container"></div>
            <script>
                fetch("${docxDataUrl}")
                    .then(res => res.blob())
                    .then(blob => {
                        return docx.renderAsync(blob, document.getElementById("container"), null, {
                            className: "docx-preview", inWrapper: true, ignoreWidth: false, ignoreHeight: false,
                            ignoreFonts: false, breakPages: true, ignoreLastRenderedPageBreak: true,
                            experimental: true, trimXmlDeclaration: true, useBase64URL: false
                        });
                    })
                    .then(() => document.getElementById("loading").style.display = 'none')
                    .catch(err => {
                        console.error("View error:", err);
                        document.getElementById("loading").innerText = "Lỗi khi hiển thị tài liệu: " + err.message;
                        document.getElementById("loading").style.color = "red";
                    });
            </script>
        </body>
        </html>
      `;
      const blob = new Blob([html], { type: "text/html; charset=utf-8" });
      const objectUrl = URL.createObjectURL(blob);
      setLocalPreviewUrl(objectUrl);
      return () => {
        URL.revokeObjectURL(objectUrl);
        URL.revokeObjectURL(docxDataUrl);
      };
    }

    // Text file extraction
    setIsLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    const abortController = new AbortController();

    fetch("/api/mindmap/extract", {
      method: "POST",
      body: formData,
      signal: abortController.signal
    })
      .then(res => res.json())
      .then(payload => {
        if (payload.error) throw new Error(payload.error);
        setLocalPreviewText((payload.text || "").trim());
      })
      .catch(err => {
        if (err.name !== 'AbortError') setError(err.message || "Không thể xem trước tài liệu");
      })
      .finally(() => setIsLoading(false));

    return () => abortController.abort();
  }, [document?.file]);

  // Reset states when a new document is opened
  useEffect(() => {
    setIsMaximized(false);
    setIsMinimized(false);
  }, [document]);

  if (!document) return null;

  const getPreviewUrl = (url?: string) => {
    if (!url) return null;

    // Check if it's a Google domain before attempting ID extraction for Google Viewer
    const isGoogleDomain = url.includes("google.com") || url.includes("drive.google.com") || url.includes("docs.google.com");

    if (isGoogleDomain) {
      // Handle native Google Docs
      const docDMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
      if (docDMatch) {
        return `https://docs.google.com/document/d/${docDMatch[1]}/preview`;
      }

      // Handle Drive files (PDF, DOCX, XLSX, etc.)
      let fileId: string | null = null;
      const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileDMatch) {
        fileId = fileDMatch[1];
      }

      const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idMatch && !fileId) {
        fileId = idMatch[1];
      }

      if (fileId) {
        // Use standard Drive preview for all file types as it's more stable for iframe embedding
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }

    // For local or other links, return as is
    return url;
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-300 ${isMinimized ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        onClick={onClose}
      />
      <div
        className={`fixed z-[60] flex flex-col bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] transition-all duration-300 overflow-hidden ${isMinimized
          ? "bottom-0 right-4 translate-y-full opacity-0 pointer-events-none scale-50"
          : isMaximized
            ? "inset-0 w-screen h-screen max-w-none rounded-none opacity-100 scale-100"
            : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-5xl h-[calc(100vh-2rem)] md:h-[90vh] rounded-2xl opacity-100 scale-100"
          }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 select-none ${isMaximized ? "rounded-t-none" : "rounded-t-2xl"}`}>
          <div className="flex min-w-0 flex-col">
            <p className="truncate text-[15px] font-bold text-slate-800 leading-tight">{document.title}</p>
            {/* <p className="truncate text-xs text-slate-500 font-medium mt-0.5">Xem trước tài liệu đã chọn</p> */}
          </div>
          <div className="flex items-center gap-3 ml-4 shrink-0">
            {(document.downloadUrl || document.id || localPreviewUrl) && (
              <Button
                variant="outline"
                size="sm"
                className="bg-white hover:bg-slate-50 text-sm px-3 h-9 shadow-sm font-medium text-slate-700"
                onClick={() => {
                  const targetUrl = localPreviewUrl || getPreviewUrl(document.downloadUrl) || document.downloadUrl
                  window.open(targetUrl || (document.id ? `/document/${document.id}` : ""), "_blank", "noopener,noreferrer")
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                Mở trong tab mới
              </Button>
            )}
            <div className={`flex items-center gap-1 ${(document.downloadUrl || document.id || localPreviewUrl) ? 'pl-3 border-l' : ''} border-slate-200`}>
              <button
                className="p-1.5 hover:bg-slate-100 text-slate-600 rounded transition-colors"
                onClick={() => setIsMinimized(true)}
                title="Thu nhỏ"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                className="p-1.5 hover:bg-slate-100 text-slate-600 rounded transition-colors"
                onClick={() => setIsMaximized(!isMaximized)}
                title={isMaximized ? "Thu gọn cửa sổ" : "Phóng to cửa sổ"}
              >
                {isMaximized ? <Copy className="h-4 w-4 scale-90" /> : <Square className="h-4 w-4" />}
              </button>
              <button
                className="p-1.5 hover:bg-red-50 hover:text-red-500 text-slate-600 rounded transition-colors ml-1"
                onClick={onClose}
                title="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-slate-50 relative">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-600">Đang tải tài liệu...</div>
          ) : error ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-red-600">{error}</div>
          ) : document.content ? (
            document.content
          ) : localPreviewUrl ? (
            <iframe
              src={localPreviewUrl}
              title={document.title}
              className="absolute inset-0 h-full w-full border-0"
            />
          ) : localPreviewText ? (
            <div className="h-full overflow-auto p-6">
              <article className="mx-auto max-w-3xl whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700">
                {localPreviewText}
              </article>
            </div>
          ) : getPreviewUrl(document.downloadUrl) ? (
            <iframe
              src={getPreviewUrl(document.downloadUrl)!}
              title={document.title}
              className="absolute inset-0 h-full w-full border-0"
              allow="autoplay"
            />
          ) : (
            <div className="flex flex-col h-full items-center justify-center space-y-4">
              <p className="text-sm text-slate-500">Không có bản xem trước trực tiếp cho tài liệu này.</p>
              {document.id && (
                <Link href={`/document/${document.id}`}>
                  <Button>Xem chi tiết tại trang tài liệu</Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Taskbar pill when minimized */}
      {isMinimized && (
        <div
          className="fixed bottom-0 right-4 md:right-8 z-[60] flex h-12 max-w-[300px] md:max-w-md items-center justify-between gap-3 rounded-t-xl bg-slate-800/95 backdrop-blur px-4 py-2 text-white shadow-[0_-8px_30px_rgba(0,0,0,0.2)] cursor-pointer hover:bg-slate-700 hover:-translate-y-1 transition-all duration-300 animate-in slide-in-from-bottom"
          onClick={() => setIsMinimized(false)}
          title="Bấm để mở lại cửa sổ"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Maximize2 className="h-4 w-4 text-slate-400 shrink-0" />
            <p className="truncate text-sm font-semibold">{document.title}</p>
          </div>

          <div className="flex items-center shrink-0 pl-2 border-l border-slate-600/50">
            <button
              className="rounded p-1 hover:bg-red-500/80 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              title="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface ChatbotAnswerProps {
  content: string;
}

export const getDriveThumbnail = (url: string | undefined) => {
  if (!url) return "/placeholder.svg";
  const match = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
  }
  return url;
};

const ChatbotAnswer: React.FC<ChatbotAnswerProps> = ({ content }) => {
  // Pre-process nhẹ nhàng:
  // 1. Chuyển đổi chuẩn ngoặc LaTeX sang ký hiệu $ để remark-math dễ dàng nhận diện 100%
  // 2. Dọn rác dư thừa nếu AI quên
  let processedContent = content
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$') // Block math
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$')     // Inline math
    .replace(/Tài liệu tham khảo \(/gi, 'Tài liệu tham khảo')
    .replace(/Tài liệu nên đọc tiếp \(/gi, 'Tài liệu tham khảo')
    .replace(/derivativelà/gi, 'derivative là')
    // Xóa blackslash dư thừa trước các từ tiếng Việt thông dụng
    .replace(/\\(tăng|giảm|tại|với|là|của|trong|được|có|về|và|mô|tả|theo|điểm|hai)/gi, '$1');

  return (
    <div className="chatbot-answer-ast min-w-full text-sm md:text-base leading-relaxed font-sans text-slate-700">
      <style>{`
        /* Style cho các thành phần được render từ AST */
        .chatbot-answer-ast .katex-display {
          margin: 1.5rem 0;
          padding: 1.25rem 1rem;
          background-color: #f8fafc;
          border-radius: 0.5rem;
          border: 1px solid #e2e8f0;
          overflow-x: auto;
          text-align: center;
        }
        .chatbot-answer-ast .katex-display > .katex {
          white-space: normal !important;
        }
        .chatbot-answer-ast .katex-html {
          white-space: nowrap !important;
        }
        .chatbot-answer-ast .katex {
          font-size: 1.05em;
        }
        .chatbot-answer-ast .katex-inline {
          color: #4338ca; /* Indigo 700 */
          font-weight: 600;
          margin: 0 0.125rem;
        }
        .chatbot-answer-ast > *:last-child {
          margin-bottom: 0;
        }
      `}</style>

      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
        components={{
          h2: ({ node, children, ...props }) => {
            let text = "";
            if (Array.isArray(children)) text = children.join('');
            else if (typeof children === 'string') text = children;
            else text = String(children);
            
            // Render giao diện mục La Mã riêng biệt
            const match = text.match(/^(I|II|III|IV|V|VI|VII)[\.\s]+(.*)/);
            if (match) {
              return (
                <div className="mt-8 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-800 text-white font-bold text-xs shadow-sm">
                      {match[1]}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{match[2]}</h3>
                  </div>
                  <div className="h-px w-full bg-slate-200 mt-3"></div>
                </div>
              );
            }
            return <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4 border-b pb-2" {...props}>{children}</h2>;
          },
          h3: ({ node, children, ...props }) => <h3 className="text-lg font-bold text-slate-900 mt-6 mb-3" {...props}>{children}</h3>,
          p: ({ node, children, ...props }) => <div className="mb-3 leading-relaxed" {...props}>{children}</div>,
          ul: ({ node, children, ...props }) => (
            <ul className="mb-4 pl-6 space-y-2 list-disc marker:text-slate-500" {...props}>{children}</ul>
          ),
          ol: ({ node, children, ...props }) => (
            <ol className="mb-4 pl-6 space-y-3 list-decimal marker:font-bold marker:text-slate-600" {...props}>{children}</ol>
          ),
          li: ({ node, children, ...props }) => (
            <li className="pl-1" {...props}>{children}</li>
          ),
          strong: ({ node, children, ...props }) => <strong className="font-bold text-slate-900" {...props}>{children}</strong>,
          a: ({ node, children, ...props }) => <a className="text-blue-600 hover:underline inline-flex break-words" {...props}>{children}</a>,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default ChatbotAnswer;

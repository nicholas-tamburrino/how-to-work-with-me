"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders markdown safely. No rehype-raw — only standard markdown.
 * Uses DocumentProse typography: 70ch line length, heading scale h1–h4, spacing rhythm, block code.
 */
export function SafeMarkdown({ content }: { content: string }) {
  const cleaned = content.replace("<!-- DEMO_MANUAL -->", "").trim();
  return (
    <div className="document-prose manual-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-semibold tracking-tight text-ink mt-0 mb-5 pb-2 border-b border-neutral-200">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold tracking-tight text-ink mt-8 mb-3 pt-6 border-t border-neutral-100 first:mt-0 first:pt-0 first:border-t-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-ink mt-6 mb-2">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-[0.95rem] font-semibold text-ink mt-4 mb-1.5">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="leading-[1.72] text-ink mb-5 last:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1.5 my-5 [&>li]:leading-[1.72]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1.5 my-5 [&>li]:leading-[1.72]">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-ink">{children}</strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-neutral-300 bg-neutral-50/80 pl-4 py-2 pr-4 my-5 text-mute italic rounded-r-md">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-8 border-0 border-t border-neutral-200" />,
          pre: ({ children }) => (
            <pre className="min-w-0 overflow-x-auto" style={{ margin: 0 }}>
              {children}
            </pre>
          ),
          code: ({ className, children, ...props }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return <code className={className} {...props}>{children}</code>;
            }
            return (
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[0.9em] font-mono text-ink">
                {children}
              </code>
            );
          },
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-mute no-underline hover:text-accent-600 hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 rounded transition-colors"
            >
              {children}
            </a>
          ),
        }}
      >
        {cleaned}
      </ReactMarkdown>
    </div>
  );
}

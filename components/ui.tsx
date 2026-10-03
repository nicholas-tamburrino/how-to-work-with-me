import * as React from "react";
import Link from "next/link";
import { Info, CheckCircle2, Sparkles, AlertTriangle } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

function cn(...values: Array<string | undefined | null | false>) {
  return values.filter(Boolean).join(" ");
}

// 1) PAGE SHELL — calm neutral background, consistent max-width and padding
export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-screen bg-app">
      <div className={cn("content-container max-w-5xl py-10 sm:py-14 relative", className)}>
        {children}
      </div>
    </div>
  );
}

/** Centered content wrapper: same padding as content-container, for use inside layout. */
export function PageContainer({
  children,
  className,
  narrow,
}: {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  return (
    <div
      className={cn(
        "content-container w-full mx-auto",
        narrow ? "max-w-xl" : "max-w-5xl",
        "py-8 sm:py-10",
        className
      )}
    >
      {children}
    </div>
  );
}

// 2) CARD SYSTEM (elevation + padding rhythm from design tokens)
export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-token bg-surface-2 shadow-card transition-all duration-200 hover:shadow-card-hover hover:border-accent-100",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-5 sm:px-6 pt-5 sm:pt-6 pb-2", className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "font-display text-title font-semibold tracking-tight text-ink",
        className
      )}
    >
      {children}
    </h2>
  );
}

export function CardDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("mt-1 text-sm text-mute leading-relaxed", className)}>
      {children}
    </p>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-5 sm:px-6 pb-5 sm:pb-6", className)}>{children}</div>;
}

export function CardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-5 sm:px-6 pb-5 sm:pb-6 pt-2", className)}>{children}</div>
  );
}

// 3) TYPOGRAPHY LADDER
// H1 (PageTitle): display font, large (3xl-4xl)
// H2 (SectionTitle): display font, medium (lg-xl)
// Label (eyebrow/topic tags): uppercase 12-13px, muted-2
// Body: 15px leading-6, ink
// Helper (MutedText): 14-15px leading-6, mute
// Micro: 12px mute-2
export function PageTitle({
  children,
  eyebrow,
  className,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">
          {eyebrow}
        </p>
      )}
      <h1 className="font-display text-3xl sm:text-4xl md:text-[2.75rem] font-semibold tracking-tight text-ink">
        {children}
      </h1>
    </div>
  );
}

export function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "font-display text-lg sm:text-xl font-medium tracking-tight text-ink",
        className
      )}
    >
      {children}
    </h2>
  );
}

export function BodyText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-body-sm sm:text-body leading-relaxed text-ink", className)}>
      {children}
    </p>
  );
}

export function MutedText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-caption sm:text-body-sm leading-relaxed text-mute", className)}>
      {children}
    </p>
  );
}


// 4) BUTTONS (consistent radius, hover, typography from design system)
function buttonBase(size: ButtonSize): string {
  const base =
    "inline-flex items-center justify-center rounded-lg font-medium tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-500 focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  if (size === "sm") {
    return cn(base, "px-3.5 py-1.5 text-caption");
  }
  if (size === "lg") {
    return cn(base, "px-6 py-3 text-body-sm");
  }
  return cn(base, "px-4 py-2.5 text-body-sm");
}

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string
): string {
  const base = buttonBase(size);
  const variantClass =
    variant === "primary"
      ? "bg-accent-700 text-white shadow-[0_4px_14px_rgba(5,150,105,0.35)] hover:bg-accent-800 hover:shadow-[0_6px_20px_rgba(5,150,105,0.4)] focus-visible:ring-accent-500"
      : variant === "secondary"
      ? "bg-surface-2 text-ink border border-token hover:bg-surface hover:border-accent-200 shadow-sm hover:shadow-md"
      : variant === "destructive"
      ? "bg-error-50 text-error-700 border border-error-200 hover:bg-error-50/80"
      : "bg-transparent text-mute hover:text-ink hover:bg-surface";

  return cn(base, variantClass, className);
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonClasses(variant, size, className)}
        {...rest}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link
      href={href}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {children}
    </Link>
  );
}

// 5) BADGE (semantic tokens: accent for default, success/muted)
export function Badge({
  children,
  className,
  tone = "default",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "success" | "muted";
}) {
  const toneClass =
    tone === "success"
      ? "bg-success-50 text-success-700 ring-1 ring-success-700/20"
      : tone === "muted"
      ? "bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200"
      : "bg-accent-50 text-accent-700 ring-1 ring-accent-200/60";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-overline font-medium uppercase tracking-[0.18em]",
        toneClass,
        className
      )}
    >
      {children}
    </span>
  );
}

/** Reusable callout for tips, onboarding, and helper content. */
export function InfoCallout({
  title,
  children,
  variant = "info",
  icon: iconOverride,
  compact = false,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  variant?: "info" | "success" | "neutral" | "warning";
  icon?: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const DefaultIcon =
    variant === "success"
      ? CheckCircle2
      : variant === "warning"
      ? AlertTriangle
      : variant === "neutral"
      ? Sparkles
      : Info;

  const containerClass =
    variant === "success"
      ? "bg-surface-3 border-success-200 border-l-success-600"
      : variant === "warning"
      ? "bg-surface-3 border-warning-600/40 border-l-warning-600"
      : variant === "neutral"
      ? "bg-surface-3 border-token border-l-neutral-300"
      : "bg-surface-3 border-accent-200 border-l-accent-600";

  const iconChipClass =
    variant === "success"
      ? "bg-surface-2 text-success-700 ring-1 ring-success-200/60"
      : variant === "warning"
      ? "bg-surface-2 text-warning-700 ring-1 ring-warning-600/30"
      : variant === "neutral"
      ? "bg-surface-2 text-mute ring-1 ring-token"
      : "bg-surface-2 text-accent-700 ring-1 ring-accent-200/60";


  const iconEl = iconOverride ?? <DefaultIcon className="h-4 w-4" aria-hidden />;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border border-l-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        compact ? "px-4 py-3" : "px-4 py-3 sm:px-5 sm:py-4",
        containerClass,
        className
      )}
    >
      <div
        className={cn(
          "shrink-0 flex h-8 w-8 items-center justify-center rounded-lg",
          iconChipClass
        )}
        aria-hidden
      >
        {iconEl}
      </div>
      <div className="min-w-0 flex-1">
        {title && (
          <p className="font-display text-[13px] font-medium tracking-tight text-ink mb-1.5">
            {title}
          </p>
        )}
        <div className="text-[15px] leading-6 text-mute [&_a]:text-accent-600 [&_a:hover]:underline [&_a]:underline-offset-2 [&_a]:focus-visible:ring-2 [&_a]:focus-visible:ring-accent-500 [&_a]:focus-visible:ring-offset-2 [&_ul]:space-y-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:list-outside">
          {children}
        </div>
      </div>
    </div>
  );
}

// 6) DIVIDER + SPACING HELPERS
export function SectionDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 py-6", className)}>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />
      <div className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />
    </div>
  );
}

export function Stack({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6 sm:space-y-8 animate-[fade-in-up_420ms_ease-out]", className)}>
      {children}
    </div>
  );
}

/** Document shell for manual + share: white surface, subtle border and shadow, 65–75ch-friendly width. */
export function Document({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "document-layout mx-auto w-full max-w-3xl rounded-xl border border-token bg-surface-2 shadow-document transition-shadow duration-200 hover:shadow-document-hover p-6 sm:p-8 lg:p-10 flex flex-col gap-8",
        className
      )}
    >
      {children}
    </article>
  );
}

/** Document header: title + optional badges and meta. Used on manual and share views. */
export function DocumentHeader({
  title,
  children,
  className,
}: {
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "border-b border-token pb-6 space-y-3 shrink-0",
        className
      )}
    >
      <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-ink">
        {title}
      </h1>
      {children}
    </header>
  );
}

/** Document footer branding. Use after prose. */
export function DocumentFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "pt-6 border-t border-token text-center shrink-0",
        className
      )}
    >
      <p className="text-xs text-mute tracking-wide">
        How To Work With Me — your communication guide
      </p>
    </footer>
  );
}


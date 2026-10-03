"use client";

import React from "react";

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function LoadingButton({
  isLoading = false,
  loadingText,
  children,
  disabled,
  ...rest
}: LoadingButtonProps) {
  const isDisabled = disabled || isLoading;

  const { className, ...buttonRest } = rest;
  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-busy={isLoading}
      className={`transition-colors duration-200 ${className ?? ""}`}
      {...buttonRest}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
            aria-hidden
          />
          {loadingText ?? children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

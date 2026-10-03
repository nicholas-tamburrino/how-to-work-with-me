"use client";

import { useState, useEffect } from "react";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  InfoCallout,
} from "@/components/ui";

function EmptyStateIllustration() {
  return (
    <svg
      aria-hidden
      className="mx-auto h-24 w-24 text-accent/30"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="20" y="28" width="80" height="64" rx="6" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M20 44h80M20 56h56M20 68h48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="88" cy="72" r="12" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M88 66v6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ONBOARDING_DISMISSED_KEY = "htwwm_onboarding_dismissed";

export function OnboardingEmptyState() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "true") {
        setDismissed(true);
      }
    } catch {
      // keep default false so onboarding shows
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
      setDismissed(true);
    } catch {
      setDismissed(true);
    }
  };

  if (dismissed) return null;

  return (
    <Card className="border-accent-200/60 bg-accent-50/30">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <Badge tone="default">Getting started</Badge>
            <CardTitle className="mt-2">
              Your manual is a short guide you share with others
            </CardTitle>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-sm text-mute hover:text-ink transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 rounded ring-offset-surface"
            aria-label="Dismiss"
          >
            Got it
          </button>
        </div>
        <InfoCallout title="How it works" variant="info" className="mt-3">
          <ul>
            <li><strong>Answer a few questions</strong> about how you work best</li>
            <li><strong>We generate a manual</strong> you can actually share</li>
            <li><strong>Edit and refine</strong> the wording anytime</li>
            <li><strong>Share view-only links</strong> for teammates, partners, or friends</li>
            <li><strong>Export PDF</strong> when you want a file</li>
          </ul>
        </InfoCallout>
      </CardHeader>
      <CardBody className="pt-0">
        <p className="text-sm leading-6 text-mute">
          Create your first manual below to get started.
        </p>
      </CardBody>
    </Card>
  );
}

export function EmptyStateCard() {
  return (
    <section className="max-w-xl space-y-6">
      <OnboardingEmptyState />
      <Card>
        <CardHeader>
          <div className="flex flex-col items-center text-center sm:block sm:text-left">
            <EmptyStateIllustration />
            <CardTitle className="mt-4">Create your first manual</CardTitle>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <InfoCallout title="How it works" variant="info">
            <ul>
              <li><strong>Answer a few questions</strong> about how you work best</li>
              <li><strong>We generate a manual</strong> you can actually share</li>
              <li><strong>Edit and refine</strong> the wording anytime</li>
              <li><strong>Share view-only links</strong> for teammates or partners</li>
              <li><strong>Export PDF</strong> when you want a file</li>
            </ul>
          </InfoCallout>
          <ButtonLink href="/app/new" size="lg">
            Start a manual
          </ButtonLink>
        </CardBody>
      </Card>
    </section>
  );
}

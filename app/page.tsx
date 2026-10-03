import Link from "next/link";
import {
  Badge,
  BodyText,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  MutedText,
  PageShell,
  PageTitle,
  SectionDivider,
  SectionTitle,
  Stack,
} from "@/components/ui";

export default function LandingPage() {
  return (
    <PageShell>
      <div className="grid gap-16 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)] items-center">
        <section className="space-y-10 motion-safe-fade-up">
          <div className="relative overflow-hidden rounded-3xl border border-token bg-surface-2 px-5 py-6 sm:px-7 sm:py-8 hero-glow">
            <div className="space-y-4 max-w-xl relative z-10">
              <Badge className="mb-1">HOW TO WORK WITH ME</Badge>
              <PageTitle eyebrow="Personal collaboration manual">
                Clarity on how you work best — in one shareable page.
              </PageTitle>
              <div className="space-y-3">
                <BodyText>
                  Answer a short, human set of questions. We turn your words into a
                  clear, plain-language manual teammates can actually use.
                </BodyText>
                <MutedText>
                  No labels. No personality tests. Just clarity on how to communicate,
                  make decisions, and support you at work.
                </MutedText>
                <MutedText className="text-xs sm:text-sm">
                  Made for real conversations — with partners, teams, and friends.
                </MutedText>
              </div>
            </div>
          </div>

          <Card className="glass border-none mt-2 sm:mt-4">
            <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <BodyText className="font-semibold">
                  Start your manual in a few minutes.
                </BodyText>
                <BodyText className="text-mute">
                  Create a private space for how you work best, then share it when
                  you&apos;re ready.
                </BodyText>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <ButtonLink
                  href="/sign-in?redirect_url=/auth/callback"
                  size="lg"
                  className="focus-ring-accent elevate-hover"
                >
                  Create your manual
                </ButtonLink>
                <ButtonLink
                  href="/app/demo"
                  variant="secondary"
                  size="lg"
                  className="hidden sm:inline-flex elevate-hover"
                >
                  View a live demo
                </ButtonLink>
              </div>
            </CardBody>
          </Card>

          <div className="flex flex-col gap-3 pt-2">
            <MutedText>
              Trusted by people who care about working together on purpose — not by
              accident.
            </MutedText>
            <a
              href="#why-teams-use-it"
              className="group inline-flex items-center gap-2 self-start text-xs font-medium text-mute hover:text-ink focus-ring-accent"
            >
              Scroll to see how teams use it
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-token bg-surface-2 shadow-sm transition-transform group-hover:translate-y-0.5 motion-safe-fade-up"
                aria-hidden
              >
                ↓
              </span>
            </a>
          </div>
        </section>

        <section className="space-y-6">
          <Card className="border-none">
            <CardHeader className="pb-3">
              <CardTitle>What your manual captures</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-ink">
                  Your best communication patterns
                </p>
                <MutedText>
                  How to reach you, how to give feedback, and what “urgent” really
                  means for you.
                </MutedText>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-ink">
                  How you make decisions
                </p>
                <MutedText>
                  What you need to feel confident, and how teammates can move work
                  forward with you.
                </MutedText>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-ink">
                  Stress, support, and boundaries
                </p>
                <MutedText>
                  Early stress signals, what helps, and the boundaries that keep
                  you at your best.
                </MutedText>
              </div>
            </CardBody>
          </Card>
        </section>
      </div>

      <SectionDivider className="mt-16" />

      <Stack className="mt-4">
        <section id="why-teams-use-it" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <SectionTitle>Why teams use it</SectionTitle>
            <MutedText className="sm:text-right">
              Designed for new teammates, managers, and collaborators who want to
              skip the guesswork.
            </MutedText>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <Card>
              <CardBody className="space-y-2">
                <Badge tone="muted">FOR NEW COLLABORATORS</Badge>
                <p className="text-sm font-semibold text-ink">
                  “Here&apos;s how to work with me.”
                </p>
                <MutedText>
                  Share during onboarding or kickoffs so people know how to partner
                  with you from week one.
                </MutedText>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="space-y-2">
                <Badge tone="muted">FOR MANAGERS</Badge>
                <p className="text-sm font-semibold text-ink">
                  Understand each person faster.
                </p>
                <MutedText>
                  Go beyond “what do you prefer?” and get to concrete examples of
                  what helps and what doesn&apos;t.
                </MutedText>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="space-y-2">
                <Badge tone="muted">FOR TEAMS</Badge>
                <p className="text-sm font-semibold text-ink">
                  Normalize talking about how you work.
                </p>
                <MutedText>
                  Build shared language around communication, focus time, and
                  boundaries — without personality labels.
                </MutedText>
              </CardBody>
            </Card>
          </div>
        </section>

        <section className="space-y-6">
          <SectionTitle>How it works</SectionTitle>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="shadow-none border-dashed border-neutral-200 bg-white/70">
              <CardBody className="space-y-2">
                <Badge tone="muted">STEP 1</Badge>
                <p className="text-sm font-semibold text-ink">Answer 8–10 prompts</p>
                <MutedText>
                  Short, reflective questions about communication, decisions,
                  stress, and support.
                </MutedText>
              </CardBody>
            </Card>
            <Card className="shadow-none border-dashed border-neutral-200 bg-white/70">
              <CardBody className="space-y-2">
                <Badge tone="muted">STEP 2</Badge>
                <p className="text-sm font-semibold text-ink">
                  We turn them into a manual
                </p>
                <MutedText>
                  Your words stay your words. We structure them into a clean,
                  readable document.
                </MutedText>
              </CardBody>
            </Card>
            <Card className="shadow-none border-dashed border-neutral-200 bg-white/70">
              <CardBody className="space-y-2">
                <Badge tone="muted">STEP 3</Badge>
                <p className="text-sm font-semibold text-ink">
                  Share or export in one click
                </p>
                <MutedText>
                  Send a private link, or export a polished PDF for onboarding docs
                  and 1:1s.
                </MutedText>
              </CardBody>
            </Card>
          </div>
        </section>

        <footer className="flex flex-col gap-3 pt-4 border-t border-neutral-200/70 mt-4 sm:flex-row sm:items-center sm:justify-between">
          <MutedText>How To Work With Me · Built for thoughtful teams.</MutedText>
          <div className="flex flex-wrap gap-3 text-xs text-mute">
            <Link href="/app/demo" className="underline-offset-4 hover:underline">
              Try the demo
            </Link>
          </div>
        </footer>
      </Stack>
    </PageShell>
  );
}

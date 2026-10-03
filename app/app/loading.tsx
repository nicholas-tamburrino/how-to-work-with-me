/** Skeleton while app dashboard loads. Calm, minimal. */
export default function AppLoading() {
  return (
    <div className="content-container max-w-4xl mx-auto motion-safe:animate-[fade-in-up_350ms_ease-out]">
      <div className="space-y-10 animate-pulse">
        <div>
          <div className="h-8 w-48 bg-neutral-200 rounded-md" />
          <div className="h-4 w-64 mt-2 bg-neutral-100 rounded-md" />
        </div>
        <div className="h-12 w-40 bg-neutral-200 rounded-full" />
        <div className="space-y-2">
          <div className="h-5 w-32 bg-neutral-100 rounded-md" />
          <div className="h-14 w-full bg-neutral-100 rounded-lg" />
          <div className="h-14 w-full bg-neutral-100 rounded-lg" />
          <div className="h-14 w-4/5 bg-neutral-100 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

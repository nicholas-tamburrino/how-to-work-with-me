/** Skeleton while manual page loads. Matches document layout. */
export default function ManualLoading() {
  return (
    <div className="motion-safe:animate-[fade-in-up_350ms_ease-out]">
      <div className="space-y-8 sm:space-y-10 animate-pulse">
        <div className="space-y-1">
          <div className="h-5 w-28 bg-neutral-200 rounded-md" />
          <div className="h-4 w-64 bg-neutral-100 rounded-md" />
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="h-10 w-36 bg-neutral-200 rounded-full" />
          <div className="h-10 w-28 bg-neutral-200 rounded-full" />
          <div className="h-10 w-32 bg-neutral-100 rounded-full" />
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />
        <div className="rounded-xl border border-neutral-200 bg-white p-7 sm:p-9 lg:p-11 shadow-document space-y-6">
          <div className="border-b border-neutral-200 pb-6 space-y-3">
            <div className="h-7 w-56 bg-neutral-200 rounded-md" />
            <div className="h-4 w-24 bg-neutral-100 rounded-md" />
            <div className="h-3 w-48 bg-neutral-100 rounded-md" />
          </div>
          <div className="max-w-[70ch] space-y-4">
            <div className="h-4 w-full bg-neutral-100 rounded-md" />
            <div className="h-4 w-[95%] bg-neutral-100 rounded-md" />
            <div className="h-4 w-4/5 bg-neutral-100 rounded-md" />
            <div className="h-5 w-3/4 mt-6 bg-neutral-200 rounded-md" />
            <div className="h-4 w-full bg-neutral-100 rounded-md" />
            <div className="h-4 w-[90%] bg-neutral-100 rounded-md" />
            <div className="h-4 w-2/3 bg-neutral-100 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

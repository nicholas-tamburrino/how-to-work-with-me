/** Skeleton while questionnaire page loads. */
export default function NewManualLoading() {
  return (
    <div className="max-w-xl mx-auto space-y-8 animate-pulse">
      <div>
        <div className="h-4 w-20 bg-stone-200 rounded" />
        <div className="h-8 w-56 mt-2 bg-stone-200 rounded" />
        <div className="h-4 w-80 mt-1 bg-stone-100 rounded" />
      </div>
      <div className="h-1.5 bg-stone-200 rounded-full" />
      <div className="space-y-4">
        <div className="h-4 w-24 bg-stone-100 rounded" />
        <div className="h-6 w-full bg-stone-200 rounded" />
        <div className="h-28 w-full bg-stone-100 rounded" />
      </div>
      <div className="flex justify-between pt-4">
        <div className="h-10 w-20 bg-stone-200 rounded-lg" />
        <div className="h-10 w-24 bg-stone-200 rounded-lg" />
      </div>
    </div>
  );
}

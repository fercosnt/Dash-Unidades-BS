export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="mb-6">
        <div className="h-7 w-56 rounded bg-white/10" />
        <div className="mt-1 h-4 w-80 rounded bg-white/10" />
      </div>
      <div className="rounded-xl bg-white shadow-md p-6 space-y-3">
        <div className="h-10 w-full rounded bg-gray-200" />
        <div className="h-10 w-full rounded bg-gray-200" />
        <div className="h-10 w-full rounded bg-gray-200" />
        <div className="h-10 w-3/4 rounded bg-gray-200" />
      </div>
    </div>
  );
}

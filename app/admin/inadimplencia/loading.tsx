export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-64 rounded bg-white/10" />
      <div className="h-4 w-48 rounded bg-white/10" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-white shadow-md p-4">
            <div className="h-4 w-20 rounded bg-gray-200 mb-2" />
            <div className="h-6 w-28 rounded bg-gray-200" />
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl bg-white shadow-md p-6 space-y-3">
        <div className="h-10 w-full rounded bg-gray-200" />
        <div className="h-10 w-full rounded bg-gray-200" />
        <div className="h-10 w-full rounded bg-gray-200" />
      </div>
    </div>
  );
}

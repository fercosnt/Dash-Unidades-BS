import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen p-8 flex flex-col items-center justify-center">
      <div className="max-w-md w-full p-8 space-y-6 rounded-lg border border-slate-200 bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-[#0A2463]">
          Beauty Smile Partners Dashboard
        </h1>
        <p className="text-slate-600">
          Dashboard multi-tenant para gestão financeira das clínicas parceiras.
          Tema Admin (Deep Blue).
        </p>
        <Link
          href="/login"
          className="block w-full text-center rounded-md bg-[#0A2463] px-4 py-2 text-white font-medium hover:opacity-90 transition-opacity"
        >
          Começar
        </Link>
      </div>
    </main>
  );
}

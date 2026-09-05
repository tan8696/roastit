import Link from "next/link";

export default function StaticPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-2xl mx-auto px-5 py-16">
        <Link
          href="/"
          className="text-sm text-white/40 hover:text-white transition-colors"
        >
          ← Back to Brutal Roaster
        </Link>
        <h1 className="text-3xl font-black tracking-tight text-white mt-6 mb-8">
          {title}
        </h1>
        <div className="space-y-4 text-sm text-white/60 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

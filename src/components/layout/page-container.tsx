export function PageContainer({ wide = false, children }: { wide?: boolean; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className={`mx-auto px-5 py-8 sm:px-8 ${wide ? "max-w-7xl" : "max-w-6xl"}`}>{children}</div>
    </main>
  );
}

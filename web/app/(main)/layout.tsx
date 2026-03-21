import BottomNav from "@/components/layout/BottomNav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="pb-16 max-w-lg mx-auto min-h-screen bg-white">
        {children}
      </main>
      <BottomNav />
    </>
  );
}

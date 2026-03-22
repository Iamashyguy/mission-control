import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { StatusBar } from "@/components/StatusBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <Sidebar />
      <TopBar />
      <main
        style={{
          marginLeft: "var(--sidebar-width)",
          marginTop: "var(--topbar-height)",
          marginBottom: "var(--statusbar-height)",
          padding: "24px",
          minHeight: "calc(100vh - var(--topbar-height) - var(--statusbar-height))",
        }}
      >
        {children}
      </main>
      <StatusBar />
    </div>
  );
}

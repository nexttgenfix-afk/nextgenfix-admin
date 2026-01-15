import type React from "react";
import Sidebar from "../../../components/sidebar";
import Header from "../../../components/header";
import { Toaster } from "@/components/ui/sonner";
import ToastManager from "@/components/ui/toast-manager";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-2 md:p-4">
          {children}
          <Toaster />
          <ToastManager />
        </main>
      </div>
    </div>
  );
}

export const metadata = {};

import type { Metadata } from "next";
import "./globals.css";
import "./auth.css";
import { Shell } from "../components/shell";
import { AuthProvider } from "../components/auth-provider";

export const metadata: Metadata = {
  title: "DSA Copilot — learn by thinking",
  description: "A Socratic learning environment for data structures and algorithms.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AuthProvider><Shell>{children}</Shell></AuthProvider></body></html>;
}

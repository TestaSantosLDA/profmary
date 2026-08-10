import "./globals.css";

// The root layout is a pass-through: the html/body shell lives in
// [locale]/layout.tsx so the lang attribute can follow the active locale.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return children;
}

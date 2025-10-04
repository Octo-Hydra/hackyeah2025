import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resetuj hasło",
  description: "Ustaw nowe hasło do swojego konta OnTime.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Weryfikacja e-mail",
  description: "Weryfikuj swój adres e-mail, aby aktywować konto OnTime.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function VerifyEmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

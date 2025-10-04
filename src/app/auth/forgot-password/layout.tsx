import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Przypomnij hasło",
  description:
    "Zresetuj swoje hasło do OnTime. Wyślemy Ci e-mail z linkiem do zresetowania hasła.",
  alternates: {
    canonical: "/auth/forgot-password",
  },
  openGraph: {
    title: "Przypomnij hasło | OnTime",
    description:
      "Zresetuj swoje hasło do OnTime - wyślemy link na Twój e-mail.",
    url: "/auth/forgot-password",
  },
  twitter: {
    title: "Przypomnij hasło | OnTime",
    description:
      "Zresetuj swoje hasło do OnTime - wyślemy link na Twój e-mail.",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zaloguj się",
  description:
    "Zaloguj się do OnTime, aby śledzić transport publiczny w czasie rzeczywistym, otrzymywać alerty o opóźnieniach i planować optymalne trasy.",
  alternates: {
    canonical: "/auth/signin",
  },
  openGraph: {
    title: "Zaloguj się | OnTime",
    description:
      "Zaloguj się do OnTime - śledź transport publiczny w czasie rzeczywistym.",
    url: "/auth/signin",
  },
  twitter: {
    title: "Zaloguj się | OnTime",
    description:
      "Zaloguj się do OnTime - śledź transport publiczny w czasie rzeczywistym.",
  },
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

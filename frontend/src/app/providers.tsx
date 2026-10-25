import type { PropsWithChildren } from "react";
import { ClerkProvider } from "@clerk/react";
import { shadcn } from "@clerk/ui/themes";

import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider } from "./ThemeProvider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
       <ClerkProvider
  appearance={{
    theme: shadcn,
    variables: {
      colorBackground: "#111827",
      colorForeground: "#f3f4f6",
      colorPrimary: "#52d2c5",
      colorInput: "#0b1220",
      colorInputForeground: "#f3f4f6",
      colorBorder: "#334155",
      borderRadius: "12px",
    },
  }}
  afterSignOutUrl="/"
>
  {children}
</ClerkProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

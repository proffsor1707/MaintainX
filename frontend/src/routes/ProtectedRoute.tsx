import type { PropsWithChildren } from "react";
import { useAuth } from "@clerk/react";
import { Redirect } from "wouter";

export default function ProtectedRoute({ children }: PropsWithChildren) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect to="/login" />;

  return children;
}
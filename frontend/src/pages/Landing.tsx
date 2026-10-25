import { useAuth } from "@clerk/react";
import { Redirect } from "wouter";

import LandingLayout from "@/layouts/LandingLayout";

export default function Landing() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;

  return (
    <LandingLayout>
      <Redirect to={isSignedIn ? "/dashboard" : "/login"} />
    </LandingLayout>
  );
}
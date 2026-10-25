import { useAuth, useUser } from "@clerk/react";

export function useDashboardUser() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();

  return {
    isLoaded,
    isSignedIn,
    getToken,
    userName: user?.firstName ?? user?.fullName ?? user?.primaryEmailAddress?.emailAddress.split("@")[0] ?? "there",
    userEmail: user?.primaryEmailAddress?.emailAddress ?? "No email address available",
  };
}
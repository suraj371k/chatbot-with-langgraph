"use client";

import { Spinner } from "@/components/ui/spinner";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function isAuth(Component: any) {
  return function IsAuth(props: any) {
    const router = useRouter();

    const { user, loading: isLoading, profile } = useAuthStore();
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
      let mounted = true;
      const init = async () => {
        // If we already have a user, mark initialized
        if (user) {
          if (mounted) setInitialized(true);
          return;
        }

        // If a profile fetch is in progress, wait for it
        if (isLoading) return;

        // Try to fetch profile once before deciding to redirect
        try {
          await profile();
        } catch (e) {
          // ignore errors here - we'll redirect below if still unauthenticated
        } finally {
          if (mounted) setInitialized(true);
        }
      };

      init();
      return () => {
        mounted = false;
      };
    }, [user, isLoading, profile]);

    useEffect(() => {
      if (initialized && !isLoading && !user) {
        router.replace("/auth/login");
      }
    }, [initialized, user, isLoading, router]);

    if (isLoading || !initialized) {
      return (
        <div className="flex h-[80%] w-full justify-center items-center">
          <Spinner />
        </div>
      );
    }

    if (!user) {
      return null;
    }

    return <Component {...props} />;
  };
}

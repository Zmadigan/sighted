"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-sm font-semibold text-bark-500 hover:text-bark-700"
      onClick={async () => {
        await authClient.signOut();
        // Forget pages saved for offline use, so the next person on this phone can't see them.
        navigator.serviceWorker?.controller?.postMessage("clear-cache");
        router.push("/");
        router.refresh();
      }}
    >
      Log out
    </button>
  );
}

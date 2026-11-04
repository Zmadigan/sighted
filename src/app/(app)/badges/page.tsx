import { redirect } from "next/navigation";

// Badges now live on your profile page.
export default function BadgesPage() {
  redirect("/profile");
}

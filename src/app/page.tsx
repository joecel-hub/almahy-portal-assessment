import { redirect } from "next/navigation";

// proxy.ts already sends "/" to /dashboard or /login; this is the fallback.
export default function Home() {
  redirect("/dashboard");
}

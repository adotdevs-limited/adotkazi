import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/domains/platform/tenancy/active-organization";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-24 text-center">
      <span className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-2xl text-xl font-bold">
        A
      </span>
      <div className="grid gap-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Hire and train talent, all in one place.
        </h1>
        <p className="text-muted-foreground mx-auto max-w-md text-balance">
          AdotKazi is an AI-powered recruitment and applicant tracking platform for organizations
          across East Africa.
        </p>
      </div>
      <div className="flex gap-3">
        <Button nativeButton={false} render={<Link href="/sign-up" />}>
          Get started
        </Button>
        <Button nativeButton={false} variant="outline" render={<Link href="/sign-in" />}>
          Sign in
        </Button>
      </div>
    </main>
  );
}

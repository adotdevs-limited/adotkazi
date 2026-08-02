"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const signInSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export function SignInForm({
  googleEnabled,
  redirectTo = "/dashboard",
}: {
  googleEnabled: boolean;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof signInSchema>) {
    setIsSubmitting(true);
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message ?? "Could not sign you in. Check your email and password.");
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back — sign in to continue to AdotKazi.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {googleEnabled && (
          <>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => authClient.signIn.social({ provider: "google", callbackURL: redirectTo })}
            >
              Continue with Google
            </Button>
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <div className="bg-border h-px flex-1" />
              or
              <div className="bg-border h-px flex-1" />
            </div>
          </>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl render={<Input type="email" autoComplete="email" {...field} />} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-muted-foreground text-xs hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl
                    render={<Input type="password" autoComplete="current-password" {...field} />}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Form>

        <p className="text-muted-foreground text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="text-foreground font-medium hover:underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

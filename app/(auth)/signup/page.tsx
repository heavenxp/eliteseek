import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata = {
  title: "Create Account — EliteSeek",
};

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

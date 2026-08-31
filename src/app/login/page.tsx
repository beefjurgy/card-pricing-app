"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm px-4 sm:px-6 py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
      <p className="text-muted text-sm mt-2">Sign in to edit your collection. Everyone else sees the public view.</p>
      <button
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="mt-6 w-full px-4 py-2.5 rounded-md bg-brand text-white hover:opacity-90 transition-opacity"
      >
        Sign in with Google
      </button>
    </div>
  );
}

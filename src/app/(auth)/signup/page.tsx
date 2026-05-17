import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signupAction } from '../actions';

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const error = typeof params.error === 'string' ? params.error : null;
  const sent = params.sent === '1';

  if (sent) {
    return (
      <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center px-6 py-12">
        <h1 className="text-2xl font-semibold">Check your inbox</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          We sent a confirmation link to your email. Click the link to verify your account, then
          you&apos;ll land on your dashboard.
        </p>
        <p className="text-muted-foreground mt-6 text-sm">
          Wrong email?{' '}
          <Link href="/signup" className="text-foreground underline">
            Try again
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold">Sign up</h1>
      <p className="text-muted-foreground mt-1 text-sm">Start listing and negotiating.</p>

      <form action={signupAction} className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={6}
          />
        </div>

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error === 'missing_fields' ? 'Email and password are required.' : error}
          </p>
        ) : null}

        <Button type="submit" className="mt-2">
          Sign up
        </Button>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-foreground underline">
          Log in
        </Link>
      </p>
    </main>
  );
}

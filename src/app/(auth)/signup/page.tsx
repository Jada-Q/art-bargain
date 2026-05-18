import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getDict } from '@/lib/i18n/server';
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
  const t = (await getDict()).auth;

  if (sent) {
    return (
      <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center px-6 py-12">
        <h1 className="font-display text-3xl">{t.sent_title}</h1>
        <p className="text-muted-foreground mt-4 text-sm leading-relaxed">{t.sent_body}</p>
        <p className="text-muted-foreground mt-6 text-sm">
          {t.wrong_email}{' '}
          <Link href="/signup" className="text-foreground underline">
            {t.try_again}
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="font-display text-3xl">{t.signup_title}</h1>
      <p className="text-muted-foreground mt-2 text-sm">{t.signup_intro}</p>

      <form action={signupAction} className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{t.email}</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{t.password}</Label>
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
            {error === 'missing_fields' ? t.missing_fields : error}
          </p>
        ) : null}

        <Button type="submit" className="mt-2">
          {t.signup_button}
        </Button>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        {t.have_account}{' '}
        <Link href="/login" className="text-foreground underline">
          {t.login_link}
        </Link>
      </p>
    </main>
  );
}

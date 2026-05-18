import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getDict } from '@/lib/i18n/server';
import { loginAction } from '../actions';

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const error = typeof params.error === 'string' ? params.error : null;
  const t = (await getDict()).auth;

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="font-display text-3xl">{t.login_title}</h1>
      <p className="text-muted-foreground mt-2 text-sm">{t.login_intro}</p>

      <form action={loginAction} className="mt-8 flex flex-col gap-4">
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
            autoComplete="current-password"
            minLength={6}
          />
        </div>

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error === 'missing_fields' ? t.missing_fields : error}
          </p>
        ) : null}

        <Button type="submit" className="mt-2">
          {t.login_button}
        </Button>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        {t.no_account}{' '}
        <Link href="/signup" className="text-foreground underline">
          {t.signup_link}
        </Link>
      </p>
    </main>
  );
}

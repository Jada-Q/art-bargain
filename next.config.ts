import type { NextConfig } from 'next';

const REQUIRED_ENV = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const;

for (const key of REQUIRED_ENV) {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[env] Required env var ${key} is missing. ` +
        `Copy .env.example to .env.local and fill in the value from Supabase Settings → API.`,
    );
  }
  if (value !== value.trim()) {
    throw new Error(
      `[env] ${key} contains leading or trailing whitespace. ` +
        `Re-set the value using \`printf "..."\` (not \`echo\`) to avoid hidden newlines.`,
    );
  }
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

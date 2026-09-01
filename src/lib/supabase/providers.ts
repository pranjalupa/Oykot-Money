import "server-only";

/**
 * Which auth providers the Supabase project actually has enabled.
 *
 * Read from the project's own settings endpoint rather than hardcoded, so a
 * social button only appears once its provider is configured — no dead button
 * that errors with "provider is not enabled", and no redeploy needed to make
 * it show up. Cached briefly so enabling a provider takes effect on its own.
 */
export type EnabledProviders = { google: boolean };

export async function getEnabledProviders(): Promise<EnabledProviders> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { google: false };

  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      next: { revalidate: 60 },
    });
    if (!res.ok) return { google: false };

    const data = (await res.json()) as { external?: Record<string, boolean> };
    return { google: data.external?.google === true };
  } catch {
    // Never let a settings hiccup take down the login page — the email form
    // still works without this.
    return { google: false };
  }
}

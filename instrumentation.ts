/**
 * Next.js instrumentation — runs before the app boots.
 * Normalizes BETTER_AUTH_URL (adds https:// if missing) so Better Auth gets a valid URL.
 */
export async function register() {
  const url = process.env.BETTER_AUTH_URL;
  if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
    process.env.BETTER_AUTH_URL = `https://${url}`;
  }
}

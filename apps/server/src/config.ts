export function publicOrigin(env: NodeJS.ProcessEnv = process.env): string {
  const url = new URL(env.PUBLIC_URL || `http://localhost:${env.PORT || 4310}`);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new Error('PUBLIC_URL must be an HTTP(S) origin without credentials');
  return url.origin;
}

// The only launch configuration. No contract or social account has been supplied.
export const project = {
  name: 'REPRO', token: '$REPRO', tagline: 'MAKE IT BREAK FIRST.',
  xUrl: '', solanaCA: '', isLaunched: false,
  repository: 'https://github.com/punfun123/repro',
};

export function isSolanaAddress(value: string): boolean {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) return false;
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let decoded = 0n;
  for (const char of value) decoded = decoded * 58n + BigInt(alphabet.indexOf(char));
  let bytes = 0;
  while (decoded > 0n) { bytes++; decoded >>= 8n; }
  return bytes + (value.match(/^1*/)?.[0].length ?? 0) === 32;
}

export function launchInfo(config: { solanaCA: string; isLaunched: boolean }) {
  const launched = config.isLaunched && isSolanaAddress(config.solanaCA);
  return { launched, buyUrl: launched ? `https://pump.fun/coin/${config.solanaCA}` : null };
}

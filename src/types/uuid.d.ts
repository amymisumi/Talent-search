declare module 'uuid' {
  export function v4(): string;
  export function v4(options: { random: Uint8Array }): string;
  export function v4(options: { rng: () => Uint8Array }): string;
}

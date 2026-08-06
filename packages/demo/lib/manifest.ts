// A second entry point that lazily loads the shared `greeter` module. Together
// with the barrel (`index.ts`), which imports the same module statically, this
// exercises the multi-entry code-splitting path: `greeter` must be emitted once
// as a shared chunk referenced by both `index.js` and `manifest.js`.
export async function greetLazily(name: string): Promise<string> {
  const { greet } = await import('./greeter.js');
  return greet(name, { greeting: 'Lazy hello' });
}

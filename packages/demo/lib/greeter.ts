export interface GreetOptions {
  greeting?: string;
  shout?: boolean;
}

export function greet(name: string, options: GreetOptions = {}): string {
  const { greeting = 'Hello', shout = false } = options;
  const message = `${greeting}, ${name}!`;
  return shout ? message.toUpperCase() : message;
}

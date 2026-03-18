export function parseJsonData<T>(
  content: string,
  validate: (parsed: unknown) => T | null,
): T | null {
  try {
    const raw = JSON.parse(content);
    return validate(raw);
  } catch {
    return null;
  }
}

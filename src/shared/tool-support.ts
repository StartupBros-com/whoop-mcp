/** Build the shared non-mutating annotation contract for WHOOP read tools. */
export function readOnlyAnnotations(title: string) {
  return {
    title,
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  };
}

/** Wrap a JSON-serializable object in the MCP text response shape. */
export function jsonTextResponse(value: object) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(value, null, 2)!,
      },
    ],
  };
}

/** Preserve the tools' existing error response wording and fallback. */
export function errorTextResponse(error: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: `Error: ${
          error instanceof Error ? error.message : 'Unknown error occurred'
        }`,
      },
    ],
    isError: true,
  };
}

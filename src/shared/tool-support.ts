/** Build the shared non-mutating annotation contract for WHOOP read tools. */
export function readOnlyAnnotations(title: string) {
  return {
    title,
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  };
}

/** Build a fresh MCP text envelope for either response path. */
function textResponse(text: string) {
  return {
    content: [
      {
        type: 'text' as const,
        text,
      },
    ],
  };
}

/** Wrap a JSON-serializable object in the MCP text response shape. */
export function jsonTextResponse(value: object) {
  return textResponse(JSON.stringify(value, null, 2)!);
}

/** Preserve the tools' existing error response wording and fallback. */
export function errorTextResponse(error: unknown) {
  return {
    ...textResponse(`Error: ${
      error instanceof Error ? error.message : 'Unknown error occurred'
    }`),
    isError: true,
  };
}

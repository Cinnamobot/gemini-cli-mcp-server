# Suggested Commands

## Development

- `bun run dev`: Start the server in watch mode.
- `bun run build`: Build the project (Node.js target).
- `bun run build:prod`: Minified production build.

## Quality Control

- `bun run lint`: Run Biome linting.
- `bun run lint:md`: Run markdownlint.
- `bun run format`: Run Biome formatter.
- `bun run check`: Run Biome CI check (lint + format).

## Testing

- `bun test`: Run all tests.
- `bun test:unit`: Run unit tests.
- `bun test:integration`: Run integration tests.

## Running

- `bun run index.ts`: Run the server directly.
- `MCP_LANGUAGE=ja bun run index.ts`: Run with Japanese locale.

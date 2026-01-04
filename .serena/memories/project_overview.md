# Project Overview: Gemini CLI MCP Server

MCP server wrapper for Google's Gemini CLI. It allows AI assistants (like Claude) to use Gemini's features through the Model Context Protocol (MCP).

## Key Features

- `googleSearch`: Execute Google search via Gemini.
- `chat`: Direct conversation with Gemini.
- `analyzeFile`: Analyze images, PDFs, and text files using Gemini's multimodal capabilities.

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Language**: TypeScript
- **Tooling**: [Biome](https://biomejs.dev) (Linting, Formatting)
- **Protocol**: [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- **External CLI**: [Gemini CLI](https://github.com/google-gemini/gemini-cli)

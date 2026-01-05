# Gemini CLI MCP Server

[![CI](https://github.com/Cinnamobot/gemini-cli-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/Cinnamobot/gemini-cli-mcp-server/actions/workflows/ci.yml)

🇯🇵 **[日本語](README.ja.md)**

A simple MCP server wrapper for Google's [Gemini CLI](https://github.com/google-gemini/gemini-cli) that enables AI assistants to use Gemini's capabilities through the Model Context Protocol.

## ✨ Features

- **4 Tools**: `googleSearch`, `chat`, `listSessions`, `analyzeFile`
- **Session Persistence**: Resume previous conversations with session IDs (supports custom IDs)
- **Internationalization**: English and Japanese support
- **Cross-Platform**: Windows, macOS, and Linux compatible

## 🚀 Quick Setup

### With Claude Code

```bash
claude mcp add -s project gemini-cli -- npx gemini-cli-mcp-server --allow-npx
```

### Manual Configuration

```json
{
  "mcpServers": {
    "gemini-cli-mcp-server": {
      "command": "npx",
      "args": ["gemini-cli-mcp-server", "--allow-npx"]
    }
  }
}
```

## 🛠️ Available Tools

### googleSearch

Performs a Google search using Gemini CLI.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `query` | ✅ | The search query |
| `limit` | | Maximum number of results |
| `raw` | | Return structured results with URLs |
| `model` | | Gemini model (default: `gemini-2.5-pro`) |

### chat

Have a conversation with Gemini.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `prompt` | ✅ | The conversation prompt |
| `sessionId` | | Resume a previous session (supports custom IDs like "my-task") |
| `model` | | Gemini model (default: `gemini-2.5-pro`) |

### listSessions

Lists available Gemini CLI sessions. Returns session IDs that can be used with chat's `sessionId` parameter.

### analyzeFile

Analyze files using Gemini's multimodal capabilities.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `filePath` | ✅ | Absolute path to the file |
| `prompt` | | Additional analysis instructions |
| `sessionId` | | Resume a previous session (maintains context) |
| `model` | | Gemini model (default: `gemini-2.5-pro`) |

**Supported file types:**

- **Images**: PNG, JPG, JPEG, GIF, WEBP, SVG, BMP
- **Text**: TXT, MD
- **Documents**: PDF

## 💾 Session Management

You can use **Custom Session IDs** (Client IDs) to manage conversations. The server automatically maps these to Gemini CLI's internal session IDs.

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "chat",
    "arguments": {
      "prompt": "Hello!",
      "sessionId": "my-task-1"
    }
  },
  "id": 1
}
```

- **Persistence**: Mappings are stored in **memory**. They will be reset if the MCP server restarts (Gemini's internal history remains, but the link to your custom ID is lost).
- **Listing**: Use `listSessions` to see active mappings.

## 🌐 Language Settings

Tool descriptions and error messages support multiple languages:

```bash
# Japanese
MCP_LANGUAGE=ja npx gemini-cli-mcp-server --allow-npx

# English (default)
MCP_LANGUAGE=en npx gemini-cli-mcp-server --allow-npx
```

System locale (e.g., `LANG=ja_JP.UTF-8`) is also auto-detected.

## 📝 Development

```bash
# Clone and install
git clone https://github.com/Cinnamobot/gemini-cli-mcp-server
cd gemini-cli-mcp-server
bun install

# Run tests
bun test

# Build
bun run build
```

## 🙏 Credits

This project is based on [choplin/mcp-gemini-cli](https://github.com/choplin/mcp-gemini-cli).

### Additions from fork

- **listSessions tool**: List available Gemini CLI sessions
- **Session persistence**: Resume conversations with `sessionId` parameter
- **Internationalization**: Japanese/English support
- **Windows compatibility**: Custom `findExecutable` function (no `which`/`where` dependency)
- **CI/CD**: GitHub Actions for automated testing and building

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Related Links

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [Gemini CLI](https://github.com/google-gemini/gemini-cli)

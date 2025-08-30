# nvidia-usdcode-mcp-server

A minimal MCP server that exposes a single tool backed by NVIDIA USDCode via the NVIDIA Integrate API. Great for Isaac Sim scripting tips, USD, Python snippets, and API usage.

## Requirements

- Node.js 18+
- An NVIDIA API key in `NVIDIA_API_KEY`, get it from here https://build.nvidia.com/nvidia/usdcode 

You can place it in a local `.env` file (loaded automatically) or export it in your shell.

## Quickstart

Dependencies are already vendored in this workspace. If you need to reinstall:

- `npm ci` or `npm install`

Build

- `npm run build`

Outputs to `dist/`.

Run (standalone)

- `npm start` (after building)
- Or directly: `node --enable-source-maps dist/server.js`

The server speaks MCP over stdio and is intended to be launched by an MCP-capable client.

## Use with Claude Desktop

Add an entry to your `~/.claude/config.json`:

```json 
{
  "mcpServers": {
    "usdcode": {
      "command": "node",
      "args": ["dist/server.js"],
      "env": { "NVIDIA_API_KEY": "YOUR_KEY" }, // if you didn't add .env to this project
      "disabled": false
    }
  }
}
```

## Use with OpenAI Codex

Add an entry to your `~/.codex/config.toml`:

```toml 
[mcp_servers.usdcode]
command = "node"
args = ["/absolute/path/to/mcp-usdcode/dist/server.js"]
env = { "NVIDIA_API_KEY" = "value" }
```


## Tool Info

- name: `get_usdcode_help`
- description: Ask NVIDIA USDCode for help.
- params:
  - `question` (string, required): Your prompt or question.
  - `temperature` (number, optional, default 0.1)
  - `top_p` (number, optional, default 1)
  - `max_tokens` (integer, optional, default 1024)
  - `expert_type` (string, optional, default "auto")

Returns a single `text` message with the model’s reply.
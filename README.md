# Marimo Documenation MCP Server

A Model Context Protocol (MCP) server that provides access to the [Marimo Documentation](https://docs.marimo.io).

This TypeScript-based MCP server lets you fetch and search through Marimo's API documentation, providing structured access to components, interfaces, and examples across all documentation sections.

## Features

### Tools

#### get_element_api
Get detailed API documentation for any Marimo UI element or component.
- Input: `element` (string) - Name of the element to get documentation for (e.g., "slider", "button")
- Output: Structured API documentation including:
  - Title and description
  - Parameters with types and defaults
  - Code examples
  - Usage patterns

#### search_api
Search across all Marimo API documentation.
- Input: `query` (string) - Search term to find in documentation
- Output: Array of matching documentation entries from any section

### Documentation Sections

The server provides access to documentation for all Marimo components:

#### Inputs
- Form elements (button, checkbox, dropdown, etc.)
- Data inputs (array, dataframe, dictionary)
- File handling (file, file_browser)
- Interactive elements (slider, range_slider, tabs)

#### Layouts
- Structural components (accordion, sidebar, tree)
- Organization tools (callout, carousel)
- Content management (lazy, routes)

#### Media
- Media elements (audio, video, image)
- File handling (download, pdf)
- Text display (plain_text)

#### Core Features
- Markdown
- Control Flow
- Plotting
- HTML
- State Management
- And more...

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

## Installation

### With Claude Desktop

Add to: 
- MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "marimo-docs": {
      "command": "/path/to/marimo-docs/build/index.js"
    }
  }
}
```

### With VSCode Cline Extension

Add to: 
- MacOS: `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`
- Windows: `%APPDATA%/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "marimo-docs": {
      "command": "node",
      "args": ["/path/to/marimo-docs/build/index.js"]
    }
  }
}
```

## Debugging

Since MCP servers communicate over stdio, debugging can be challenging. For development, the server outputs detailed logs to stderr.

You can also use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.

## Error Handling

The server provides organized error messages that:
- List all available elements grouped by section
- Provide clear feedback on invalid requests
- Include proper HTTP error codes

## Implementation Details

- Uses Cheerio for HTML parsing of documentation pages
- Implements caching to reduce documentation fetch requests
- Handles proper URL construction for all documentation sections
- Supports recursive search across all documentation content

#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface ElementApiArgs {
  element: string;
}

interface SearchApiArgs {
  query: string;
}

interface ApiDoc {
  title: string;
  description: string;
  parameters: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
  examples: string[];
}

class MarimoDocs {
  private server: Server;
  private baseUrl: string = 'https://docs.marimo.io/api/inputs';
  private cache: Record<string, ApiDoc> = {};
  private lastFetch: Date | null = null;
  private cacheDuration: number = 1000 * 60 * 60; // 1 hour
  private endpoints: Record<string, string> = {
    'slider': '/range_slider/',
    'button': '/button/',
    'checkbox': '/checkbox/',
    'dropdown': '/dropdown/',
    'text': '/text/',
    'number': '/number/',
    'array': '/array/',
    'multiselect': '/multiselect/',
    'radio': '/radio/',
    'switch': '/switch/',
    'date': '/date/',
    'time': '/time/',
    'file': '/file/',
  };

  constructor() {
    this.server = new Server(
      {
        name: 'marimo-docs',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.server.onerror = (error: Error): void => console.error('[MCP Error]', error);
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_element_api',
          description: 'Get API documentation for a specific UI element',
          inputSchema: {
            type: 'object',
            properties: {
              element: {
                type: 'string',
                description: 'The UI element to get documentation for (e.g., "slider")',
              },
            },
            required: ['element'],
          },
        },
        {
          name: 'search_api',
          description: 'Search API documentation',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
              },
            },
            required: ['query'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!request.params.arguments) {
        throw new McpError(ErrorCode.InvalidParams, 'Missing arguments');
      }

      switch (request.params.name) {
        case 'get_element_api': {
          const args = request.params.arguments as unknown as ElementApiArgs;
          if (!args?.element) {
            throw new McpError(ErrorCode.InvalidParams, 'Missing element parameter');
          }
          const doc = await this.fetchDoc(args.element);
          return {
            content: [{ type: 'text', text: JSON.stringify(doc, null, 2) }],
          };
        }
        case 'search_api': {
          const args = request.params.arguments as unknown as SearchApiArgs;
          if (!args?.query) {
            throw new McpError(ErrorCode.InvalidParams, 'Missing query parameter');
          }
          const results = await this.searchDocs(args.query);
          return {
            content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
          };
        }
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  private async fetchDoc(element: string): Promise<ApiDoc> {
    const endpoint = this.endpoints[element as keyof typeof this.endpoints];
    if (!endpoint) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Unknown element: ${element}. Available elements: ${Object.keys(this.endpoints).join(', ')}`
      );
    }

    try {
      console.error(`Fetching documentation for ${element}...`);
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept-Language': 'en-US,en;q=0.5'
        }
      });
      
      if (!response.data) {
        throw new McpError(
          ErrorCode.InternalError,
          'Empty response from Marimo docs'
        );
      }

      const $ = cheerio.load(response.data);
      const content = $('.md-content');
      
      // Get the title
      const title = content.find('h1').first().text().trim();
      
      // Get full description from all paragraphs
      const descriptions = Array.from(content.find('p')).map(el => 
        $(el).text().trim()
      ).filter(text => text.length > 0);
      
      const description = descriptions.join('\n\n');

      // Parse API section for parameters
      const docSection = content.find('.doc-children').first();
      const parameters = docSection.length ? this.parseParameters(docSection) : [];
      
      // Parse examples from code blocks
      const exampleElements = content.find('pre code');
      const examples = Array.from(exampleElements).map(el => 
        $(el).text().trim()
      ).filter(text => text.length > 0);

      return {
        title,
        description,
        parameters,
        examples
      };

    } catch (error) {
      console.error(`Error fetching documentation for ${element}:`, error);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch documentation for ${element}`
      );
    }
  }

  private parseParameters(section: any): Array<{name: string; description: string; required: boolean}> {
    const $ = cheerio.load(section.html() || '');
    const parameters: Array<{name: string; description: string; required: boolean}> = [];
    
    $('tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        parameters.push({
          name: cells.eq(0).text().trim(),
          description: cells.eq(1).text().trim(),
          required: cells.eq(2)?.text().includes('required') || false,
        });
      }
    });

    return parameters;
  }

  private async searchDocs(query: string): Promise<ApiDoc[]> {
    const results: ApiDoc[] = [];
    for (const element of Object.keys(this.endpoints)) {
      try {
        const doc = await this.fetchDoc(element);
        if (JSON.stringify(doc).toLowerCase().includes(query.toLowerCase())) {
          results.push(doc);
        }
      } catch (error) {
        console.error(`Error searching ${element}:`, error);
      }
    }
    return results;
  }

  public async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Marimo Docs MCP server running on stdio');
  }
}

const server = new MarimoDocs();
void server.run().catch(console.error);

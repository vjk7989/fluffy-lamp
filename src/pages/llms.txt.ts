import type { APIRoute } from 'astro';
import { SITE } from '@data/constants';

const baseUrl = import.meta.env.SITE.replace(/\/$/, '');

const llmsTxt = `# ${SITE.title}

> PAVIi.AI provides AI infrastructure for agentic experiences, inference, AI harnesses, agentic security, MCP integrations, context engines, developer tools, model hosting, NPU optimization, and physical AI.

## Primary Pages
- Home: ${baseUrl}/
- Products: ${baseUrl}/products/
- Services: ${baseUrl}/services/
- Blog: ${baseUrl}/blog/
- Contact: ${baseUrl}/contact/

## Products
- Dev Tools: ${baseUrl}/products/dev-tools/
- Agentic Experience: ${baseUrl}/products/AX/
- Super Assistant: ${baseUrl}/products/Super-Assistant/
- Compute and Context Engine: ${baseUrl}/products/compute/

## Key Topics
- AI inference and model routing
- AI harnesses for testing and evaluation
- LLM architecture and context engineering
- Agentic experience for business applications
- Agentic security, permissions, MCP safety, and tool access
- MCP and A2A integrations for AI-accessible products
- NPU optimized models and efficient inference

## Business Details
- Name: ${SITE.title}
- Email: ${SITE.email}
- Locations: Hyderabad, Telangana, India and Bangalore, Karnataka, India
- Website: ${SITE.url}
`;

export const GET: APIRoute = () =>
  new Response(llmsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });

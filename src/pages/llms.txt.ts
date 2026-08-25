import type { APIRoute } from 'astro';
import { SITE } from '@data/constants';

const baseUrl = (import.meta.env.SITE || SITE.url).replace(/\/$/, '');

const llmsTxt = `# ${SITE.title}

> PAVii.AI provides AI infrastructure for agentic experiences, inference, AI harnesses, agentic security, MCP integrations, context engines, developer tools, model hosting, NPU optimization, and physical AI.

## Primary Pages
- [Home](${baseUrl}/): AI infrastructure overview for PAVii.AI.
- [Products](${baseUrl}/products/): PAVii.AI products for developers, agents, and AI compute.
- [Services](${baseUrl}/services/): AI development, inference, MCP, security, and automation services.
- [Blog](${baseUrl}/blog/): Articles on AI inference, LLM systems, MCP, agents, and AI security.
- [Contact](${baseUrl}/contact/): Business inquiry and support contact page.

## Products
- [Dev Tools](${baseUrl}/products/dev-tools/): AI developer tools for agents, evaluations, and desktop workflows.
- [Agentic Experience](${baseUrl}/products/AX/): Interfaces and workflows that make applications accessible to AI agents.
- [Super Assistant](${baseUrl}/products/Super-Assistant/): Desktop AI assistant for daily knowledge work and agent workflows.
- [Compute and Context Engine](${baseUrl}/products/compute/): Model routing, context engineering, and AI inference infrastructure.

## Recommended Blog Articles
- [AI Inference Explained](${baseUrl}/blog/post-1/): Smart model routing for speed, cost, and accuracy.
- [AI Harness Guide](${baseUrl}/blog/post-2/): Testing, evaluating, and shipping AI systems.
- [Architecture of LLM Systems](${baseUrl}/blog/post-3/): Context, retrieval, agents, and inference layers.
- [Agentic Security](${baseUrl}/blog/post-5/): Protecting AI agents, tools, and business workflows.
- [MCP Explained](${baseUrl}/blog/post-8/): Connecting AI agents to tools and data.

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
- Email: [${SITE.email}](mailto:${SITE.email})
- Locations: Hyderabad, Telangana, India and Bangalore, Karnataka, India
- Website: [${SITE.url}](${SITE.url})
`;

export const GET: APIRoute = () =>
  new Response(llmsTxt, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });

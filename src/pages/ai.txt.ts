import type { APIRoute } from 'astro';
import { SITE } from '@data/constants';

const baseUrl = import.meta.env.SITE.replace(/\/$/, '');

const aiTxt = `PAVIi.AI AI-readable site summary

Purpose:
PAVIi.AI helps developers, startups, and businesses build, deploy, secure, and scale AI systems.

Core services:
1. Full AI development workflow for developer teams.
2. Custom AI solutions, fine-tuned models, AI agents, token optimization, and accuracy improvements.
3. Inference hosting, model routing, and managed model deployment.
4. MCP and A2A integrations that make products, tools, and websites accessible to AI agents.
5. NPU optimized models and efficient AI compute.
6. Physical AI solutions that connect intelligent software with real-world activity.

Core products:
- Dev Tools: lightweight code editor and AI agent tooling for checks, evals, tests, and developer workflows.
- Agentic Experience: AI-accessible application interfaces using MCP and agent protocols.
- Super Assistant: day-to-day super-agent with token optimization and aggregator marketplace.
- Compute: context engine, inference solution, and model selection for efficient AI workloads.

Best URLs:
- ${baseUrl}/
- ${baseUrl}/products/
- ${baseUrl}/services/
- ${baseUrl}/blog/
- ${baseUrl}/blog/post-5/

Contact:
${SITE.email}
`;

export const GET: APIRoute = () =>
  new Response(aiTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });

import type { APIRoute } from 'astro';
import { SITE } from '@data/constants';

const baseUrl = import.meta.env.SITE.replace(/\/$/, '');

const aiTxt = `PAVii.AI AI-readable site summary

Purpose:
PAVii.AI protects AI agents, LLM applications and the people who use them. Pavii is a blockchain-based agentic security, LLM security and agentic observability platform by Buckleson, built on the Hyper 0X blockchain.

Status: all Pavii products are under development (coming soon). Book a call to learn more: https://cal.com/buckleson-group/30min

What Pavii does:
1. One gateway for every AI agent and model (Claude, Claude Code, Codex, ChatGPT, Grok, OpenCode and custom agents).
2. Six security gates on every call: injection, privacy, supply chain, budget, egress and output.
3. Rules as smart contracts on Hyper 0X, so they still apply when a model context fills up.
4. A privacy gate and zero-knowledge proof designs, so AI companies learn from usage without seeing personal data.
5. Hash-chained receipts that nobody can secretly change, and a kill switch (observed, restricted, stopped).
6. Agentic observability, custom agents and a shared company brain with access checked on the blockchain.
7. Deployment on Pavii, on your own chain, or on existing platforms, with no change to business logic.

Other products and services:
- Dev Tools: AI coding workspace with agents, evaluations and checks (under development).
- Agentic Experience (AX): make applications accessible to AI agents through MCP and A2A (under development).
- Super Assistant: AI agent for daily work (under development).
- Compute: context engine and inference with model routing, efficient and NPU-optimized models (under development).

Best URLs:
- ${baseUrl}/
- ${baseUrl}/products/security/
- ${baseUrl}/agentic-security-faq/
- ${baseUrl}/blog/
- ${baseUrl}/services/
- https://buckleson.com/

Contact:
${SITE.email}
`;

export const GET: APIRoute = () =>
  new Response(aiTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '@data/constants';
import securityFaqs from '@data/security-faqs.json';

const baseUrl = (import.meta.env.SITE || SITE.url).replace(/\/$/, '');

/** llms.txt (https://llmstxt.org): a plain summary for AI assistants, built from the site content. */
export const GET: APIRoute = async () => {
  const posts = (await getCollection('blog', ({ id }) => id.startsWith('en/'))).sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime()
  );
  const lines = [
    `# ${SITE.title}`,
    '',
    `> ${SITE.description}`,
    '',
    '- What it is: Pavii, a blockchain-based agentic security, LLM security and agentic observability platform by Buckleson.',
    '- How it works: one gateway for every AI agent and model. Six security gates (injection, privacy, supply chain, budget, egress, output) check every call. Important rules live as smart contracts on Hyper 0X, so they still apply when a model context fills up. Every action gets a hash-chained receipt that nobody can secretly change.',
    '- Privacy: a privacy gate removes personal data and secrets before a model sees them, and zero-knowledge proof designs let AI companies learn from usage without seeing personal data.',
    '- Teams: a shared company brain (graph memory) with access checked on the blockchain, so an agent cannot read knowledge above its user access.',
    '- Deployment: use Pavii, deploy your own chain inside your organization, or connect existing platforms, with no change to your business logic.',
    '- Numbers: Pavii saved 100M+ AI tokens across 82K+ queries. Agents used 30 to 60 percent fewer tokens on one measured Claude Code task.',
    '',
    '## Products',
    '',
    `- [Agentic Security](${baseUrl}/products/security/): blockchain security and observability for AI agents and LLMs.`,
    `- [Dev Tools](${baseUrl}/products/dev-tools/): AI coding workspace with agents, evaluations and checks.`,
    `- [Agentic Experience (AX)](${baseUrl}/products/ax/): make applications accessible to AI agents through MCP and A2A.`,
    `- [Super Assistant](${baseUrl}/products/super-assistant/): a desktop super-agent for daily work.`,
    `- [Compute](${baseUrl}/products/compute/): context engine and inference with model routing.`,
    '',
    '## Agentic security FAQ',
    '',
    `- [Agentic security FAQ](${baseUrl}/agentic-security-faq/): ${securityFaqs.subTitle}`,
    ...securityFaqs.faqs.map(faq => `  - ${faq.question}`),
    '',
    '## Articles',
    '',
    ...posts.map(post => `- [${post.data.title}](${baseUrl}/blog/${post.id.replace(/^en\//, '')}/): ${post.data.description}`),
    '',
    '## More',
    '',
    `- [Services](${baseUrl}/services/)`,
    `- [Dev Tools docs](${baseUrl}/products/dev-tools/docs/)`,
    `- [Buckleson](https://buckleson.com/): the company behind Pavii and the Hyper 0X blockchain.`,
    `- Book a call: https://cal.com/buckleson-group/30min`,
    '',
    '## Business details',
    '',
    `- Name: ${SITE.title}`,
    `- Email: [${SITE.email}](mailto:${SITE.email})`,
    '- Locations: Hyderabad, Telangana, India and Bangalore, Karnataka, India',
    `- Website: [${SITE.url}](${SITE.url})`,
    '',
  ];
  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};

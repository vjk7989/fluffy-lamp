/**
 * Data for the animated "follow one request" explainers (FlowStack). Each
 * flow is a list of layers that a request passes, top to bottom. A run with
 * `stopAt` is caught at that layer (zero-based) and shows `reason`; a run
 * without `stopAt` reaches the end row and shows `done`.
 * Icons are names in data_files/flow-icons.json (MingCute).
 */
interface Layer { icon: string; title: string; text: string; chips?: string[] }
interface Run { label: string; icon: string; stopAt?: number; reason?: string; done?: string }
interface Flow { label: string; unit: string; layers: Layer[]; end: { icon: string; title: string; text: string }; runs: Run[] }

export const flows = {
  security: {
    label: 'Pavii · every agent call',
    unit: 'call',
    layers: [
      { icon: 'idcard', title: 'One gateway, every agent', text: 'Every prompt and tool call from every agent comes in through one entry point, so each call has a known sender.', chips: ['Claude', 'Codex', 'ChatGPT', 'Custom'] },
      { icon: 'warning', title: 'Injection gate', text: 'Text from web pages, files, emails and tool results is data. Pavii never runs it as an instruction.', chips: ['Hidden prompts', 'Jailbreaks'] },
      { icon: 'eye-close', title: 'Privacy gate', text: 'Pavii removes personal data, keys and secrets before a model sees them.', chips: ['Personal data', 'API keys'] },
      { icon: 'box-3', title: 'Supply-chain gate', text: 'New packages, plug-ins and MCP servers must be on the allow-list, match a pinned hash or pass a sandbox test.', chips: ['MCP', 'Packages'] },
      { icon: 'dashboard-2', title: 'Budget gate', text: 'Each agent has limits on tokens, spend and call rate.', chips: ['Tokens', 'Spend', 'Loops'] },
      { icon: 'file-locked', title: 'Egress contract', text: 'A smart contract on Hyper 0X decides what an agent can send and do. Nobody can secretly change it.', chips: ['On chain', 'Approvals'] },
      { icon: 'filter', title: 'Output gate', text: 'Pavii removes scripts, secrets and system-prompt text from what the agent returns.', chips: ['Scripts', 'Secrets'] },
      { icon: 'hand', title: 'Kill switch', text: 'An agent that breaks rules moves from observed, to restricted, to stopped. A person can stop any agent.', chips: ['Observed', 'Restricted', 'Stopped'] },
    ],
    end: { icon: 'bill', title: 'Signed receipt on Hyper 0X', text: 'Pavii links each decision, allowed or blocked, to the decision before it. A deleted entry shows as a gap.' },
    runs: [
      { label: 'prompt: summarise the Q3 report', icon: 'chat-1', done: 'allowed · receipt chained' },
      { label: 'tool: read_file(invoice.pdf)', icon: 'file', stopAt: 1, reason: 'Hidden instruction in the PDF' },
      { label: 'prompt: draft a reply to a client', icon: 'chat-1', done: 'allowed · email address masked' },
      { label: 'tool: install mcp-server-x', icon: 'plugin', stopAt: 3, reason: 'Server not on the allow-list' },
      { label: 'tool: email.send(all@company)', icon: 'send', stopAt: 5, reason: 'Egress rule: no bulk email' },
      { label: 'tool: git.commit(fix)', icon: 'git-commit', done: 'allowed · receipt chained' },
      { label: 'loop: retry search x400', icon: 'refresh-2', stopAt: 4, reason: 'Call-rate limit reached' },
    ],
  },
  brain: {
    label: 'Company brain · one question',
    unit: 'query',
    layers: [
      { icon: 'user-security', title: 'Who is asking', text: 'Each agent acts for a known person. Pavii attaches that person and their role to every question.', chips: ['Person', 'Role', 'Team'] },
      { icon: 'brain', title: 'Company brain', text: 'A shared graph of documents, decisions and code that grows from daily work.', chips: ['Graph memory', 'Product graph'] },
      { icon: 'file-locked', title: 'Access contract on Hyper 0X', text: 'A smart contract checks the role against each piece of knowledge before the agent can read it.', chips: ['On chain', 'No escalation'] },
      { icon: 'eye-close', title: 'Privacy gate', text: 'Personal data and secrets leave the answer before the model sees it.', chips: ['Personal data', 'Secrets'] },
    ],
    end: { icon: 'chat-4', title: 'Answer with only what this person can see', text: 'Each read gets a receipt, so the team can see which agent read which knowledge.' },
    runs: [
      { label: 'analyst: Q3 pricing summary', icon: 'search-2', done: 'answered · 4 sources, all allowed' },
      { label: 'intern: board meeting minutes', icon: 'search-2', stopAt: 2, reason: 'Restricted to directors' },
      { label: 'engineer: billing API graph', icon: 'git-branch', done: 'answered · product graph' },
      { label: 'agent: export all customer notes', icon: 'send', stopAt: 2, reason: 'Bulk export blocked by contract' },
    ],
  },
  privacy: {
    label: 'Your data · AI providers',
    unit: 'request',
    layers: [
      { icon: 'user-3', title: 'You use an AI app', text: 'Prompts, files and tool results can hold names, numbers and secrets.', chips: ['Prompts', 'Files'] },
      { icon: 'eye-close', title: 'Privacy gate', text: 'Pavii replaces personal data with tokens before the request leaves your side.', chips: ['Masking', 'Secrets'] },
      { icon: 'safe-shield', title: 'Proofs, not documents', text: 'A zero-knowledge proof shows a fact, such as "over 18" or "verified", without the data behind it.', chips: ['ZKP', 'Facts only'] },
      { icon: 'chart-bar', title: 'Usage signals', text: 'The provider gets patterns that help it improve the model, not personal records.', chips: ['Aggregates', 'No raw data'] },
      { icon: 'file-locked', title: 'Egress contract', text: 'A smart contract on Hyper 0X decides which data can leave. Raw personal data cannot.', chips: ['On chain'] },
    ],
    end: { icon: 'ai', title: 'The model improves, your data stays yours', text: 'Each data release gets a receipt that you and the provider can both check.' },
    runs: [
      { label: 'prompt with a passport number', icon: 'chat-1', done: 'sent · number replaced by a token' },
      { label: 'verify age for a service', icon: 'fingerprint', done: 'proof sent · no birth date shared' },
      { label: 'training export with names', icon: 'send', stopAt: 4, reason: 'Raw personal data cannot leave' },
      { label: 'weekly usage report', icon: 'chart-bar', done: 'sent · aggregates only' },
    ],
  },
} satisfies Record<string, Flow>;

export type FlowName = keyof typeof flows;

---
title: 'Agentic Security'
description: 'Blockchain security for AI agents'
main:
  id: 0
  content: |
    Agentic Security puts every AI agent and LLM behind one Pavii gateway. Pavii checks each call at six security gates before the call can do harm. Important rules live as smart contracts on Hyper 0X, the post-quantum-resistant blockchain from Buckleson. Each action gets a receipt that nobody can secretly change.
  imgCard: '@/images/construction-image.avif'
  imgMain: '@/images/construction-image.avif'
  imgAlt: 'Pavii security diagram: blockchain security, private data, self-hosted deployment and full control'
tabs:
  - id: 'tabs-with-card-item-1'
    dataTab: '#tabs-with-card-1'
    title: 'Description'
  - id: 'tabs-with-card-item-2'
    dataTab: '#tabs-with-card-2'
    title: 'Specifications'
  - id: 'tabs-with-card-item-3'
    dataTab: '#tabs-with-card-3'
    title: 'How it works'
longDescription:
  title: 'Protect Your Agents, Your Data and Your Users'
  subTitle: |
    AI agents read data, call tools and send messages for you. Pavii checks each of these actions and blocks the harmful ones. Pavii stops malicious activity, or at least makes it visible. Personal data does not leak. Model providers and agent vendors can still learn from usage, but they never get data that can harm your users.
  btnTitle: 'Book a call to learn more'
  btnURL: 'https://cal.com/buckleson-group/30min'
descriptionList:
  - title: 'Six gates on every call'
    subTitle: 'Pavii checks each call for prompt injection, private data, unsafe packages, cost, outgoing data and unsafe output. A prompt injection is hidden text that tries to take control of an agent.'
  - title: 'Rules that the model cannot forget'
    subTitle: 'Your important rules live as smart contracts on Hyper 0X. They still apply when the context window of a model fills up and the model forgets an instruction.'
  - title: 'A record that nobody can change'
    subTitle: 'Pavii links each receipt to the one before it and anchors the chain on Hyper 0X. Nobody can secretly change or delete a record.'
specificationsLeft:
  - title: 'Injection Gate'
    subTitle: 'Finds hidden instructions in prompts, files, web pages and tool results, and blocks them.'
  - title: 'Privacy Gate'
    subTitle: 'Removes personal data and secrets before a model sees them. Zero-knowledge proof designs let a provider check a fact without seeing the data.'
  - title: 'Supply Chain Gate'
    subTitle: 'Checks the tools, packages and MCP servers that an agent wants to use before it uses them.'
  - title: 'Budget Gate'
    subTitle: 'Sets limits on tokens and spend for each agent, and stops a call that goes over the limit.'
  - title: 'Egress Gate'
    subTitle: 'An egress smart contract on Hyper 0X decides what an agent can send out and what it can do.'
  - title: 'Output Gate'
    subTitle: 'Checks the answer of the model before it reaches a user or a tool.'
specificationsRight:
  - title: 'Kill Switch'
    subTitle: 'An agent that breaks rules moves from observed to restricted to stopped. A person can stop any agent at any time.'
  - title: 'Agentic Observability'
    subTitle: 'See each call, tool, blocked action and cost for every agent. Use this record to find problems and make agents better.'
  - title: 'Company Brain'
    subTitle: 'A shared graph memory built from usage. Pavii checks access on the blockchain, so the agent of a junior employee cannot read restricted knowledge.'
  - title: 'Your Own Chain'
    subTitle: 'Use the Pavii chain, run your rules on-chain or deploy your own chain inside your organization. You do not change your business logic.'
tableData:
  - feature: ['Capability', 'Value']
    description:
      - ['Supported agents', 'Claude, Claude Code, Codex, ChatGPT, Grok, OpenCode and custom agents']
      - ['Security gates', 'Injection, privacy, supply chain, budget, egress and output']
      - ['Privacy', 'Privacy gate and zero-knowledge proof designs']
      - ['Rules', 'Smart contracts on Hyper 0X']
      - ['Control', 'Kill switch: observed, restricted, stopped']
      - ['Records', 'Hash-chained receipts anchored on Hyper 0X']
      - ['Deployment', 'Pavii chain, your own chain or your current platforms']
blueprints:
  first: '@/images/blueprint-1.avif'
  second: '@/images/blueprint-2.avif'
mainFigure: 'call-sorter'
flows: ['security', 'brain', 'privacy']
figures: ['privacy-press', 'brain-cabinet', 'rule-loom']
---

---
title: 'How Do You Stop Attacks on AI Agents? A Playbook'
description: 'How to prevent AI agent attacks: least privilege, untrusted text as data, gates before tool calls, privacy filters, pinned hashes, budgets and a kill switch.'
author: 'PAVii.AI Security'
role: 'AI Safety and Platform Team'
authorImage: '@/images/blog/jacob.avif'
authorImageAlt: 'PAVii.AI security writer avatar'
pubDate: 2026-10-15
cardImage: '@/images/blog/prompt-injection-defense.avif'
cardImageAlt: 'Security gates that check an AI agent call before it reaches a tool'
readTime: 8
tags: ['agentic security', 'ai agent security', 'llm security', 'least privilege', 'kill switch']
contents:
  - 'You stop attacks on AI agents with layers, not with one clever prompt. Give each agent the smallest access it needs. Treat all outside text as data. Check every tool call before it runs, and keep a tamper-evident record of what happened.'
  - 'This playbook maps one control to each attack in our threat map. It also shows how the six gates of Pavii and its on-chain rules apply each control in practice.'
faqs:
  - question: 'Can a better system prompt stop prompt injection?'
    answer: 'No. A system prompt helps, but the model can still follow injected text. You need controls outside the model, such as gates before tool calls and limits on what the agent can send.'
  - question: 'What is a kill switch for an AI agent?'
    answer: 'A kill switch is a control that stops an agent at once. In Pavii, an agent that breaks rules moves from observed to restricted to stopped. A person can also stop any agent at any time.'
  - question: 'How often do we need to test our agents?'
    answer: 'Test before each release and after each change to a model, prompt or tool. Attack methods change, so add new test cases when you learn about new patterns.'
---

## Why is one control never enough?

An LLM (large language model) reads instructions and data in the same stream of text. So no filter can catch every bad instruction. Each control in this playbook stops some attacks and misses others. Together, they make an attack expensive and visible.

The plan follows the attacks in our [threat map for AI agents](/blog/ai-agent-attacks-2026/). For each attack, we name the control and the Pavii gate that applies it.

## What does least privilege mean for an agent?

Least privilege means the agent gets only the access its task needs, and nothing more. This is the most important control, because it limits the damage of every other attack.

Apply it like this:

- Give each agent its own identity. Do not share one admin key across agents.
- Split tools into read, write and spend groups. Give write and spend only where needed.
- Use short-lived tokens that expire after the task.
- Scope data access to the user, not to the agent. An agent acts for a person, so it gets that person's rights.

In Pavii, the egress smart contract on Hyper 0X decides what each agent can send and do. A smart contract is a small program on a blockchain that runs the same way for everyone. Nobody can quietly widen an agent's rights, because a change needs a new on-chain rule.

## How do you treat untrusted text as data?

Mark every piece of text by its source: your instructions, the user, or the outside world. Outside text includes web pages, files, email, tool results and messages from other agents. The agent can read outside text, but outside text must never grant new permissions.

The injection gate in Pavii scans inputs and tool results for instruction patterns before the model sees them. It also keeps the source label with the text. Then a later gate can block a tool call that only outside text asked for. Read more in our guide to [prompt injection](/blog/post-10/).

## Why put gates before tool calls?

A gate is a check that runs between the agent and the tool. The model proposes a call. The gate checks the call against rules. Only then does the tool run.

A good gate checks:

1. Is this tool on the allow-list for this agent?
2. Do the arguments stay inside safe limits, for example a delete with a narrow filter?
3. Does the destination appear on the egress allow-list?
4. Does this action need a person to approve it?

Pavii puts this check on every call through one gateway. It works for Claude, Claude Code, Codex, ChatGPT, Grok, OpenCode and custom agents, with no change to your business logic.

## How do you stop data leaks?

Filter data on the way in and on the way out. The privacy gate in Pavii removes personal data and secrets before a model sees them. The model gets a placeholder, for example a token that stands for a customer name. The real value stays inside your boundary.

The output gate checks replies and files before they leave. It blocks secrets, personal data and hidden channels such as image links that carry data in the address. Pavii also uses zero-knowledge proof designs. A zero-knowledge proof lets one party prove a fact without showing the data behind it.

## How do you protect agent memory?

Treat memory writes like code changes. Record who wrote each entry and from what source. Do not let outside text write rules or policies into memory.

Pavii checks access to its shared memory, the company brain, on the blockchain. So a junior employee's agent cannot read restricted knowledge, even inside the shared brain. Privilege escalation through memory fails at the access check.

## How do you secure the supply chain?

Use allow-lists and pinned hashes. A hash is a short fingerprint of a file. If one byte changes, the hash changes. Pin each MCP server, package and model to a known hash. Then a silent update fails the check.

The supply-chain gate in Pavii checks tools and servers against the approved list before an agent can call them. New versions need review before they join the list.

## How do budgets stop cost loops?

Set a budget for each agent, each task and each user. A budget covers tokens, paid API calls and money. When an agent reaches the limit, it stops and asks a person.

The budget gate in Pavii enforces these limits on every call. Pavii also routes work to efficient models and trims context. On one measured Claude Code task, agents used 30 to 60 percent fewer tokens.

## What controls map to which attacks?

| Attack | Main control | Pavii gate or feature |
|---|---|---|
| Hidden instructions | Untrusted text as data | Injection gate |
| Tool and MCP abuse | Gate before each call | Egress gate and contract |
| Data leaks | Filter in and out | Privacy gate, output gate |
| Memory poisoning | Source labels, access checks | On-chain memory access |
| Supply chain | Allow-lists, pinned hashes | Supply-chain gate |
| Cost loops | Budgets per agent | Budget gate |
| Over-powerful agents | Least privilege | Egress contract on Hyper 0X |
| Agent to agent | Identity and trust limits | Gateway on every call |

## Why do you need a kill switch and receipts?

Some attacks will get through. So you need a fast way to stop an agent and a true record of what it did. In Pavii, an agent that breaks rules moves from observed to restricted to stopped. A person can stop any agent at any time.

Every call also creates a receipt. Pavii links receipts in a hash chain and anchors them on Hyper 0X. Nobody can secretly change or delete a record. Our post on [blockchain for AI security](/blog/blockchain-for-ai-security/) explains why this matters. Buckleson covers the same idea from the company view in [How to secure AI agents](https://buckleson.com/blog/how-to-secure-ai-agents/).

Important rules also live on-chain. A long task can fill the context window, and the model can "forget" an instruction. A smart contract does not forget. The rule still applies on call one thousand.

## How do you prove that the controls work?

Red-team your own agents. A red team plays the attacker. Write test cases for each attack in the table, then run them on every release. Use an evaluation harness, a tool that runs many test tasks and scores the results. See our post on the [AI harness](/blog/post-2/) for the method.

Pavii observability shows calls, tools, blocked actions and cost for each agent. Use this data to find weak spots and to show auditors what your agents did.

## Where should you start?

1. Give each agent its own identity and the smallest set of tools.
2. Label all outside text as data, not instructions.
3. Put a gate before every tool call, with allow-lists for tools and destinations.
4. Set budgets per agent and per task.
5. Turn on receipts and test the kill switch.
6. Route all agents through one gateway such as [Pavii Security](/products/security/).

Book a [30-minute call](https://cal.com/buckleson-group/30min) with the PAVii.AI team to build a prevention plan for your agents.

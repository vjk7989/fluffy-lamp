---
title: 'How Do You Make an AI Agent Keep Rules When Context Fills?'
description: 'AI agents keep rules after the context window fills when hard rules live outside the model. Smart contracts check every tool call the agent makes.'
author: 'PAVii.AI Security'
role: 'AI Safety and Platform Team'
authorImage: '@/images/blog/jacob.avif'
authorImageAlt: 'PAVii.AI security writer avatar'
pubDate: 2026-10-15
cardImage: '@/images/blog/ai-harness-testing.avif'
cardImageAlt: 'AI agent tool calls that pass through a rule check outside the model'
readTime: 7
tags: ['agentic security', 'smart contracts', 'context window', 'llm security']
contents:
  - 'You make an AI agent follow rules after its context fills up by moving the hard rules out of the prompt. A rule in the prompt is a request that the model can drop, forget or ignore. A rule outside the model is a check that runs on every action, whatever the model remembers. Pavii stores these rules as smart contracts on Hyper 0X, so they apply to every agent, every model and every session.'
  - 'Long agent sessions show this problem every day. The agent starts well, then after hours of work it deletes a file, sends a message or spends money that the first instruction said it must not touch. This post explains why that happens and where each kind of rule belongs.'
faqs:
  - question: 'Why does an AI agent forget its instructions?'
    answer: 'The model only sees its context window. When the session gets long, the system cuts or summarizes old text, and an early rule can disappear. A long context also gives each rule less attention.'
  - question: 'Does repeating the rules in the prompt fix the problem?'
    answer: 'It helps, but it does not enforce anything. The model can still ignore a repeated rule. Use repetition for guidance and a check outside the model for hard limits.'
  - question: 'Can a smart contract check the tone of an answer?'
    answer: 'No. A smart contract checks actions it can see, such as tool calls, amounts and recipients. Style and tone stay as guidance in the prompt.'
---

## Why does an agent forget rules when its context fills up?

An agent forgets rules because the model only knows what is in its context window right now. The context window is the amount of text a model can read in one step. It includes the system prompt, the chat, the files and every tool result. When a long session reaches the limit, something must go.

Agent tools handle a full window in three common ways:

- **Truncation.** The tool removes the oldest messages. An instruction from the start of the session can be the first thing to go.
- **Compaction.** The tool asks the model to summarize the session. A summary keeps the task and often drops the small rule, such as "never push to main".
- **Dilution.** The window is not full, but it holds so much text that one early rule gets little attention.

Prompt injection makes this worse. Untrusted text from a web page or a file can tell the model to ignore its rules. That text is often newer and closer to the action than the original instruction.

## Is a rule in the system prompt enforced?

No. A rule in the system prompt is a strong suggestion. The model reads it and usually follows it. Nothing outside the model stops the action when the model does not follow it.

This is fine for many rules. "Use British spelling" or "keep answers short" do not need enforcement. A mistake there costs little. A rule such as "never send customer data outside the company" is different. One failure is a breach.

## Which rules belong outside the model?

A rule belongs outside the model when one failure causes damage that you cannot undo. Sort your rules into two groups. Guidance helps the model do good work. Hard limits stop the agent from causing harm.

| Rule | Type | Where it lives |
|---|---|---|
| Use the team code style | Guidance | Prompt or project file |
| Ask before large refactors | Guidance | Prompt, plus human review |
| Do not spend more than a set amount per day | Hard limit | Budget gate, outside the model |
| Do not send data to unknown domains | Hard limit | Egress smart contract |
| Do not run destructive shell commands | Hard limit | Tool call check before it runs |
| Do not read restricted knowledge | Hard limit | Access check on the chain |
| Do not send personal data to a model | Hard limit | Privacy gate |

The test is simple. If one break of the rule costs you a customer or a fine, do not trust the model to remember it.

## How does a rule outside the model work?

A rule outside the model checks each action before it runs. The agent decides what to do. The gateway sees the tool call, the arguments and the destination. Then it asks the rule: is this action allowed for this agent, this user and this task?

The rule does not need to know the history of the session. It does not read the context window. It looks at the action in front of it. So it works the same in the first minute and in the tenth hour. It also works the same for Claude, Codex, ChatGPT, Grok and a custom agent, because the rule does not depend on any model.

When the rule blocks an action, the gateway returns the reason to the agent. A good agent then changes its plan. The block also creates a receipt, so your team can see which rules the agent tried to break.

## Why store the rules as smart contracts?

You store hard rules as smart contracts so that the agent, the operator and a single admin cannot change them in secret. A smart contract is a program on a blockchain that runs the same way for every caller. Every change to it is a transaction with a record.

This gives three properties that a config file on a server does not give:

1. **Nobody edits a rule quietly.** A new version of a rule has an author, a time and a record on the chain.
2. **The agent cannot reach the rule.** A coding agent with shell access can edit a local config file. It cannot edit a contract on Hyper 0X.
3. **One rule set covers many agents.** Agents from different vendors and different teams check the same contract. You change a limit once.

Pavii uses this for the egress smart contract, which decides what an agent can send and where. The same idea applies to spend limits, access rules and approval steps.

## What happens when an agent keeps breaking rules?

An agent that keeps breaking rules loses its freedom step by step. Pavii uses a kill switch with three states: observed, restricted and stopped. An agent in the observed state works normally while Pavii records its actions. Repeated blocks move it to restricted, where it can do less. A serious violation stops it.

A person can stop any agent at any time. This matters most for long sessions, where nobody watches every step.

## What does a rule outside the model not do?

A rule outside the model does not make the model smarter. It cannot fix a bad plan. It also cannot check what it cannot see. If an agent has a direct network path that does not pass through the gateway, the rule never sees that traffic. Close every side path, so all tool calls and all egress go through one checkpoint.

Keep good prompts as well. Clear instructions, pinned rules and short sessions reduce the number of blocks. The check outside the model is the floor, not the whole house. For the related problem of access, read [How do you stop an AI agent from reading data above the user access?](/blog/stop-ai-agent-privilege-escalation/). For how injected text tries to change agent behavior, read the [prompt injection guide](/blog/post-10/) and the Buckleson post on [what prompt injection is](https://buckleson.com/blog/what-is-prompt-injection/).

## Where should you start?

1. Write down every rule you give your agents today.
2. Mark each rule as guidance or a hard limit.
3. Route all tool calls and network traffic through one gateway.
4. Move each hard limit into a check that runs before the action, outside the model.
5. Store the hard limits as smart contracts so that changes leave a record.
6. Run a long test session and confirm that the limits still hold at the end.

To see how Pavii keeps agent rules in force on Hyper 0X, [book a call with the PAVii.AI team](https://cal.com/buckleson-group/30min).

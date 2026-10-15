---
title: 'How Do You Prove to an Auditor What Your AI Agent Did?'
description: 'Prove what an AI agent did with signed, hash-chained receipts. A gateway outside the agent writes them and anchors them on a blockchain for the auditor.'
author: 'PAVii.AI Security'
role: 'AI Safety and Platform Team'
authorImage: '@/images/blog/jacob.avif'
authorImageAlt: 'PAVii.AI security writer avatar'
pubDate: 2026-10-15
cardImage: '@/images/blog/prompt-injection-defense.avif'
cardImageAlt: 'Chain of signed AI agent receipts that an auditor checks against a blockchain anchor'
readTime: 8
tags: ['agentic observability', 'audit', 'receipts', 'blockchain']
contents:
  - 'You prove what an AI agent did with receipts. A receipt is a signed record of one action, written by a gateway that the agent cannot control. The receipts link into a hash chain, and the latest fingerprint goes onto a blockchain at fixed intervals. An auditor can then check the record without trusting you, your servers or your staff.'
  - 'Normal application logs do not meet this bar. The operator can edit them, and in many setups the agent can too. This post lists what a receipt must contain, how to keep an agent away from its own record and how an auditor verifies it.'
faqs:
  - question: 'What is the difference between a log and a receipt?'
    answer: 'A log is a note that a system writes for its own operators. A receipt is a signed, linked record that a third party can verify. Receipts also record which rules applied to each action.'
  - question: 'Do receipts store the prompts and outputs?'
    answer: 'Receipts store fingerprints of the prompts and outputs, not the text. The text stays in your storage, and you show it to the auditor under your normal access rules.'
  - question: 'Can an auditor verify receipts without access to my systems?'
    answer: 'Yes. You give the auditor the receipts and the public signing keys. The auditor checks the signatures and the chain, then compares the latest fingerprint with the anchor on the blockchain.'
---

## Why are normal logs not enough for an auditor?

Normal logs are not enough because the operator controls them and the auditor cannot tell if they are complete. An auditor asks two questions. Did this action happen as the record says? Is anything missing? A log on your own server can answer the first question. It cannot answer the second.

AI agents add a new problem. An agent is software that decides its own next step. Coding agents and operations agents often run with shell access on the machine that holds their logs. An agent that makes a mistake, and then follows an instruction to "clean up", can delete or change the evidence.

## What must a receipt for an AI agent action contain?

A receipt must contain enough to answer who acted, for whom, with what, under which rules and with what result. It must not contain raw personal data. Use fingerprints for the content, and keep the content in your own storage.

| Field | What it records | Why the auditor needs it |
|---|---|---|
| Agent identity and version | Which agent acted | Ties the action to a known build |
| Principal | The user or system the agent acted for | Shows whose authority it used |
| Model and provider | The model name and version that produced the output | Shows which model made the decision |
| Input fingerprint | A hash of the prompt and context | Proves the input without storing it |
| Tool call | The tool name and a hash of its arguments | Shows what the agent tried to do |
| Rule version | The version of each policy that applied | Shows which rules were in force |
| Gate decisions | Allowed, blocked or changed, with the reason | Shows the controls worked |
| Output fingerprint | A hash of the result | Proves the output without storing it |
| Cost | Tokens and spend for the action | Supports budget checks |
| Time | When the gateway saw the action | Puts actions in order |
| Previous hash | The fingerprint of the receipt before it | Links the chain |
| Signature | A signature from the gateway key | Proves who wrote the receipt |
| Anchor reference | The block that holds the next anchor | Lets anyone check the chain |

A hash is a short fingerprint of data. If the data changes by one character, the hash changes completely. So a fingerprint lets the auditor confirm that the text you show them is the text the agent used.

## How do you stop an agent from editing its own record?

You stop an agent from editing its record by making sure the agent never writes the record. The gateway writes it. The agent sends every model call and tool call through the gateway. The gateway checks the call, writes the receipt and signs it with a key that the agent cannot reach.

Follow four rules:

1. **Separate the writer.** The receipt writer runs in a different process, on a different account, from the agent.
2. **Keep the key away.** Store the signing key in a key store that the agent has no path to.
3. **Close side paths.** Block network traffic and tool access that do not pass through the gateway. Actions outside the gateway leave no receipt.
4. **Anchor often.** Publish the latest fingerprint to the blockchain at short intervals. A deletion after an anchor no longer matches.

The third rule matters most. A receipt system only proves what passes through it. If the agent can reach a database directly, the auditor sees a clean record and misses the real action.

## Why does a signed log still need an anchor?

A signed log needs an anchor because the person who holds the signing key can rewrite the log and sign it again. They can also delete the last records, or show different versions to different people. Each version looks valid.

An anchor is a copy of the latest fingerprint in a place the operator cannot change. Pavii anchors receipts on Hyper 0X, the post-quantum-resistant blockchain from Buckleson. After a fingerprint is in a block, nobody can secretly change or delete the records before it, and that includes the operator. For the full reasoning on when a local chain is enough, read [Do AI agents need a blockchain, or is a log enough?](/blog/do-ai-agents-need-blockchain/).

## How does an auditor verify the receipts?

The auditor verifies the receipts with their own tools and does not trust yours. The process takes five checks:

1. Check the signature on each receipt against the public key of the gateway.
2. Calculate the hash of each receipt and confirm it matches the "previous hash" field of the next one.
3. Calculate the latest fingerprint and compare it with the anchor on the blockchain.
4. For sampled actions, ask for the original prompt and output, calculate their hashes and compare them with the receipt.
5. Check that the rule versions in the receipts match the rules that your team approved at that time.

If all five checks pass, the auditor knows the record is complete up to the last anchor and that nobody changed it. They learn this without access to your servers.

## What can receipts not prove?

Receipts prove what happened at the gateway. They do not prove that the model reasoned well, and they do not show its hidden thoughts. They also cannot show actions that never passed through the gateway.

Be clear about this in the audit. State which systems route through the gateway, and show the network rules that block other paths. A narrow claim that you can prove is worth more than a wide claim that you cannot.

## How does Pavii produce receipts?

Pavii writes a receipt for every call through its gateway, for Claude, Claude Code, Codex, ChatGPT, Grok, OpenCode and custom agents. Each receipt records the decisions of the six gates: injection, privacy, supply chain, budget, egress and output. The receipts form a hash chain anchored on Hyper 0X.

The same data feeds agentic observability. Your team sees calls, tools, blocked actions and cost for each agent, and uses that view to improve the agents. For the base security model, read the [agentic security guide](/blog/post-5/). For more on verifiable execution, read the Buckleson post on [proof of execution for AI](https://buckleson.com/blog/proof-of-execution-ai/).

## Where should you start?

1. Route every agent model call and tool call through one gateway.
2. Define the receipt fields from the table above, and keep raw content out of them.
3. Move the receipt writer and the signing key out of reach of the agent.
4. Block side paths, so actions cannot bypass the gateway.
5. Anchor the latest fingerprint on a blockchain at fixed intervals.
6. Run a mock audit: give the receipts to a colleague and let them verify without your help.

To see how Pavii receipts work in a real audit, [book a call with the PAVii.AI team](https://cal.com/buckleson-group/30min).

---
title: 'What Is x402 and How Do AI Agents Pay for Things?'
description: 'x402 uses HTTP 402 Payment Required so an AI agent can pay for an API call in stablecoins and retry. Learn how agentic payments work and how to keep them safe.'
author: 'PAVii.AI Security'
role: 'AI Safety and Platform Team'
authorImage: '@/images/blog/jacob.avif'
authorImageAlt: 'PAVii.AI security writer avatar'
pubDate: 2026-10-15
cardImage: '@/images/blog/agentic-experience.avif'
cardImageAlt: 'AI agent that pays for an API call with a stablecoin after an HTTP 402 response'
readTime: 7
tags: ['agentic security', 'x402', 'agentic payments', 'stablecoins', 'ai agents']
contents:
  - 'x402 is an open payment protocol that uses the HTTP status code 402 Payment Required. A server answers a request with 402 and a price. The client, which can be an AI agent, pays in a stablecoin and sends the request again with proof of payment. The server checks the payment and returns the result.'
  - 'This makes it possible for agents to pay per call, with no account, card or monthly plan. It also creates new risks: runaway spend, fraud and payments that a prompt injection starts. This post explains how agentic payments work and how to keep them safe.'
faqs:
  - question: 'Does x402 need a crypto wallet?'
    answer: 'Yes. The client needs a wallet that holds a stablecoin and can sign a payment. For an AI agent, this is usually a wallet with strict limits that a person or company funds.'
  - question: 'Can an AI agent spend money without a person approving it?'
    answer: 'It can, if you allow it. We recommend a mandate with clear limits, plus human approval above a set amount. The agent then pays small amounts alone and asks for large ones.'
  - question: 'Is x402 only for AI agents?'
    answer: 'No. Any HTTP client can use it, for example a script, an app or a browser. AI agents are a strong fit because they make many small calls and cannot fill in card forms.'
---

## What problem does x402 solve?

The web has always had a status code for payment. HTTP 402 Payment Required has been part of the standard for decades, but almost nobody used it. Websites asked for payment with sign-up pages, card forms and subscriptions instead.

That model does not work for AI agents. An agent that needs one weather report, one data lookup or one page of a paid article cannot open an account for each service. It also must not hold a company credit card. x402 gives the 402 code a real job. It lets a client pay for one request, in a few seconds, with money that moves on a blockchain.

Coinbase published x402 as an open protocol in 2025. Other companies now build on it. The details can change between versions, so check the current specification before you build. The core idea stays the same.

## How does an x402 payment work step by step?

1. The agent sends a normal HTTP request to an API.
2. The server answers with status 402. The answer lists the price, the accepted token, the blockchain network and the address that receives the payment.
3. The agent's wallet signs a payment for that amount, usually in a stablecoin. A stablecoin is a token that keeps a steady value, for example one US dollar.
4. The agent sends the same request again, with the signed payment in a request header.
5. The server checks the payment and settles it on-chain. Many servers use a separate service, often called a facilitator, to do the check and settlement.
6. The server returns the data, with a payment response that the agent can keep as a receipt.

The agent needs no account, no API key and no card. The server needs no billing system. Each call stands alone.

## What are agentic payments in general?

Agentic payments are payments that an AI agent starts for a person or a company. x402 is one way to pay for API calls. Agents also buy goods, book travel, pay invoices and pay other agents. All of these share the same questions.

- **Who authorizes the payment?** A person, a company policy or the agent alone.
- **What are the limits?** Amount per payment, per day, per seller and per task.
- **What proof stays behind?** A receipt that shows who paid, what for and under which rule.

The answer to the first two questions is a mandate. A mandate is a signed instruction from a person that says what an agent can buy, from whom and up to what amount. For example, a mandate can allow data purchases from three named APIs, up to 20 US dollars per day, until the end of the month. The agent can act inside the mandate. Anything outside it needs a new approval.

## What can go wrong when agents pay?

Payments turn every agent attack into a money problem. Our [threat map for AI agents](/blog/ai-agent-attacks-2026/) covers the attacks in full. These are the ones that matter most for payments.

**Runaway spend.** An agent that pays per call can loop. A small price times many thousands of retries becomes a large bill. The agent does not feel the cost, so it does not stop.

**Fraud by fake sellers.** An attacker runs an API that answers every request with 402 and a high price. Or the attacker copies a real service and changes the receiving address. The agent pays because the response looks normal.

**Prompt-injected payments.** A web page or file contains hidden text that tells the agent to pay 50 dollars in stablecoins to an address to finish the task. The agent reads the text and treats it as a step in the task. This is prompt injection with a wallet attached.

**Price changes.** A server quotes one price and then asks for a higher one on the retry. An agent with no limit pays the new price.

**Lost records.** Without a strong receipt, a finance team cannot tell which agent paid, for which task and under which mandate.

## How do on-chain rules keep agent payments safe?

A prompt can tell an agent to be careful. It cannot stop the agent. Payment rules must sit outside the model, where injected text cannot change them.

| Risk | Control | Where it runs in Pavii |
|---|---|---|
| Runaway spend | Budgets per agent, task and day | Budget gate |
| Fake sellers | Allow-list of sellers and addresses | Egress smart contract |
| Injected payments | Pay only for user-started tasks | Injection gate plus egress gate |
| Price changes | Maximum price per call | Egress smart contract |
| Large payments | Human approval above a limit | Gateway approval step |
| Lost records | Hash-chained receipts | Receipts anchored on Hyper 0X |

In Pavii, a payment is a tool call like any other, and all six gates check it. The budget gate stops spend at the limit. The egress smart contract on Hyper 0X decides which addresses an agent can pay and how much. A smart contract is a program on a blockchain that runs the same way every time. The rule still applies when a long task fills the model's context window and the model forgets an instruction.

If an agent breaks a payment rule, the kill switch moves it from observed to restricted to stopped. A person can stop any agent at any time. For the full design, read [how blockchain is used to secure AI](/blog/blockchain-for-ai-security/) and our [prevention playbook](/blog/how-to-prevent-ai-agent-attacks/).

## Who is responsible when an agent pays the wrong party?

The company that runs the agent is responsible in most cases. So keep proof that the agent acted inside its mandate. Each Pavii receipt holds the agent identity, the rule that allowed the payment and the gate results. Pavii links receipts in a hash chain and anchors them on Hyper 0X, so nobody can secretly change or delete a record.

Good receipts also help in disputes with sellers. You can show the price that the server quoted, the amount the agent paid and the time of each step. Buckleson builds the chain behind this. See [Pavii on buckleson.com](https://buckleson.com/products/pavii/).

## Where should you start?

1. List every place where an agent can spend money today, including API keys with billing.
2. Write a mandate for each agent: sellers, limits per call and per day, and an end date.
3. Give each paying agent its own wallet with a small balance.
4. Set human approval for any payment above your chosen limit.
5. Put all payment calls behind a gate that checks budgets and allow-lists, such as [Pavii Security](/products/security/).
6. Keep a receipt for every payment and review them each week.

Book a [30-minute call](https://cal.com/buckleson-group/30min) with the PAVii.AI team to design safe payments for your agents.

---
title: 'Can an AI Company Learn From Your Data Without Seeing It?'
description: 'Yes, partly. Privacy gates, aggregation and zero-knowledge proofs let an AI company learn from usage without seeing the personal data of a user.'
author: 'PAVii.AI Security'
role: 'AI Safety and Platform Team'
authorImage: '@/images/blog/jacob.avif'
authorImageAlt: 'PAVii.AI security writer avatar'
pubDate: 2026-10-15
cardImage: '@/images/blog/local-first-ai-assistant.avif'
cardImageAlt: 'Personal data removed at a privacy gate before usage signals reach an AI provider'
readTime: 7
tags: ['ai privacy', 'zero-knowledge proofs', 'llm security', 'blockchain']
contents:
  - 'Yes, an AI company can learn a lot from your data without seeing it, but not everything. A privacy gate removes personal data and secrets before a model sees a request. Aggregation lets the provider see patterns across many users and not the record of one person. Zero-knowledge proofs let the provider check that a fact is true without seeing the data behind it.'
  - 'The honest limit is this: a provider cannot train on the exact words of your private message without those words existing somewhere. This post explains what each method protects, what the provider still sees and where the gaps are.'
faqs:
  - question: 'Does an AI provider see my prompts?'
    answer: 'By default, yes. The provider receives the full prompt to answer it. A privacy gate in front of the model removes personal data and secrets before the prompt leaves your company.'
  - question: 'What is a zero-knowledge proof in simple terms?'
    answer: 'It is a proof that a statement is true that reveals nothing else. For example, you can prove that a person is over 18 without showing the date of birth.'
  - question: 'Is removing names from data enough to protect privacy?'
    answer: 'No. A rare job title, a place and a date together can point to one person. Good privacy gates look for these combinations and not only for names.'
---

## What does an AI provider see today?

An AI provider sees everything you send to its model, unless something removes it first. That includes the prompt, any files you attach and the results of tool calls that go back into the model. Many providers state that they do not train on business data by default. That is a policy. It is not a technical limit.

Agent vendors add another layer. A third-party agent often sends your data to its own servers, then to a model provider. Each hop is a new party that can store or log the data. The question "who saw my data?" gets hard to answer.

## How does a privacy gate work?

A privacy gate removes personal data and secrets from a request before the request leaves your control. It looks for names, email addresses, phone numbers, account numbers, keys, tokens and internal identifiers. It replaces each one with a placeholder, such as `PERSON_1` or `ACCOUNT_2`.

The model works with the placeholders. It can still write the email, fix the code or summarize the case. When the answer comes back, the gate puts the real values back in for the user. The provider never receives them.

Pavii runs the privacy gate on every call, for every model and agent that passes through its gateway. That includes Claude, Claude Code, Codex, ChatGPT, Grok, OpenCode and custom agents. See the [Pavii security product](/products/security/) for the full list of gates.

## What can a provider still learn after the privacy gate?

A provider can still learn a lot. It sees the task, the structure of the request, the tools the agent called, the errors and the result. It does not see who the person is. That is often enough to improve a model or an agent.

| Signal | Provider sees it? | Why it helps |
|---|---|---|
| Type of task, for example "refund email" | Yes | Shows what users need |
| Tool calls and their order | Yes, without personal values | Shows where agents fail |
| Errors and retries | Yes | Shows weak spots in the agent |
| User corrections to an answer | Yes, with placeholders | Shows which answers were wrong |
| Names, emails, account numbers | No | Removed by the privacy gate |
| Secrets and API keys | No | Removed by the privacy gate |
| One person's full history | No | Only aggregates leave the company |

## What does aggregation add?

Aggregation means the provider sees totals across many users, not the records of one person. For example, a provider learns that many refund tasks fail at the same tool. It does not learn which customer asked for a refund.

Aggregation needs one rule to be safe: a minimum group size. A total across three people can point to one of them. Release a number only when it covers enough people that nobody can work backward to a single person. Also remove rare combinations. A rare job title, a city and a date together can identify one person even with no name.

## What do zero-knowledge proofs add?

A zero-knowledge proof lets one party prove that a statement is true without showing the data behind it. The verifier learns one thing: the statement is true. It learns nothing else.

This is useful in AI products in three ways:

1. **Prove facts about a user.** An agent proves that a customer is over 18, lives in a supported country or passed a check. The provider never sees the date of birth or the address.
2. **Prove that a request followed the rules.** A proof shows that a request passed the privacy gate and the access check, without showing its content.
3. **Prove that usage data is real.** A provider can trust that an aggregate came from real, rule-checked usage and not from fake data.

Pavii uses designs based on zero-knowledge proofs for these cases. The provider can verify facts and improve its models from signals. It does not get personal data in a form that can harm the user.

## What can these methods not do?

These methods cannot let a provider read your private text and not read it at the same time. If a model must learn the exact words of a private document, those words must exist somewhere the training process can reach. A zero-knowledge proof does not change that. It proves statements. It does not hide training data from the trainer.

Privacy gates also have limits. A gate can miss an identifier it has never seen, such as an internal project code name. Tune the gate for your company, and test it with real samples. Treat the gate as a strong filter, not as a promise of perfection.

## Why does blockchain matter here?

Blockchain gives everyone the same record of what left your company and under which rules. Pavii writes a receipt for every call and anchors the receipts on Hyper 0X, the post-quantum-resistant blockchain from Buckleson. The receipt holds fingerprints and gate decisions, not personal data.

So a customer or a regulator can check that the privacy gate ran on every call. They do not need to trust the provider or the operator. The egress smart contract also decides what an agent can send and where, so data cannot go to a destination outside the rules. For the receipt design, read [How do you prove to an auditor what your AI agent did?](/blog/prove-what-ai-agent-did/). For a related idea in banking, read the Buckleson post on [how to verify customers without sharing data](https://buckleson.com/blog/verify-customers-without-sharing-data/).

## Where should you start?

1. List every AI provider and agent vendor that receives your data today.
2. Put a privacy gate in front of all of them, so personal data and secrets never leave.
3. Decide which signals you want to share for model improvement, and share them as aggregates.
4. Set a minimum group size for every aggregate you release.
5. Use zero-knowledge proofs where a provider needs a fact and not the data.
6. Anchor receipts, so you can show that the gate ran on every call.

To see how Pavii protects user data while AI providers still learn, [book a call with the PAVii.AI team](https://cal.com/buckleson-group/30min).

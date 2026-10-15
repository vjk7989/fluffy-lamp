---
title: 'How Do You Stop an AI Agent Reading Above Your Access?'
description: 'Stop AI agent privilege escalation: make the agent use the access of the user, and check access on every read from the shared company brain.'
author: 'PAVii.AI Security'
role: 'AI Safety and Platform Team'
authorImage: '@/images/blog/jacob.avif'
authorImageAlt: 'PAVii.AI security writer avatar'
pubDate: 2026-10-15
cardImage: '@/images/blog/model-agnostic-ai.avif'
cardImageAlt: 'Shared company knowledge graph with locked nodes that an AI agent cannot read'
readTime: 7
tags: ['agentic security', 'privilege escalation', 'knowledge graph', 'blockchain']
contents:
  - 'You stop an AI agent from reading data above the access of the user by making the agent act with the rights of that user, not with its own broad account. Every read from a shared index or knowledge graph must pass an access check at the moment of the request. Summaries and answers must carry the strictest label of the data they came from. Pavii checks this access on the blockchain, so the agent and the admins cannot quietly change the rules.'
  - 'This problem gets worse as companies build a shared company brain for their agents. The more useful the brain is, the more it knows. The question is how to keep a junior employee from asking an agent for the salary table.'
faqs:
  - question: 'What is privilege escalation in an AI agent?'
    answer: 'It is when a user gets data or actions through an agent that they cannot get directly. The usual cause is an agent that runs with a service account that has more access than the user.'
  - question: 'Is it enough to filter documents when you build the index?'
    answer: 'No. Access changes after you build the index. You must check access again for each request, for each user, at the moment of the read.'
  - question: 'Can a knowledge graph leak data through links?'
    answer: 'Yes. A link to a restricted node can show that the node exists, and its name can reveal a secret. The access check must cover nodes, links and labels.'
---

## Why do AI agents read data the user cannot see?

AI agents read data above the access of the user because they usually run with their own service account. A service account is a login for software, not for a person. Teams give it wide access so the agent "just works" across many systems. The user asks a question, and the agent answers with everything that its account can see.

Security people call this the confused deputy problem. The agent is the deputy. It has more power than the person who gives it instructions, and it cannot tell when it uses that power for the wrong person. The model does not know who has the right to see what, unless something outside the model tells it.

## Where does the leak happen in a shared company brain?

The leak happens at every point where data moves from storage into the context of the model. A company brain is a shared memory for agents. It is often a knowledge graph, which is a set of facts stored as nodes and the links between them. Pavii builds this graph from usage: product graphs for coding work and a shared brain for teams.

| Leak point | What goes wrong | Fix |
|---|---|---|
| Ingestion | Restricted files enter a shared index with no labels | Label every node with its source access rules |
| Retrieval | Search returns chunks the user cannot open | Check access for each chunk at query time |
| Graph links | A link reveals that a secret project exists | Hide nodes, links and names together |
| Summaries | A summary mixes public and restricted facts | Give the summary the strictest source label |
| Agent memory | One user's private chat enters shared memory | Keep personal memory separate by default |
| Tool calls | The agent calls an API with its own wide token | Pass the identity of the user to the tool |

Most teams fix only the first row. They filter files when they build the index. Access then changes, a person moves teams, and the index still serves the old view.

## How do you make the agent act as the user?

Make the identity of the user travel with every request the agent makes. The agent must not have a standing right to read anything. It gets a short-lived grant for one user, one task and one set of data classes.

In practice, this means four rules:

1. The gateway attaches the identity of the user to every model call and tool call.
2. Each tool and each data source checks that identity, not the identity of the agent.
3. The grant expires when the task ends, so a stolen grant has a short life.
4. When two people use one agent, the agent uses the smaller set of rights.

The last rule matters for shared agents in a team channel. If a manager and a junior employee both read the answer, the answer can only contain what the junior employee can see.

## Why check access on the blockchain?

You check access on the blockchain so that no single person or process can change the rules without a record. A normal policy engine works well when you trust every admin and every service. The risk is that the same people who run the agents can also edit the access rules.

Pavii stores access rules as smart contracts on Hyper 0X. A smart contract is a program on a blockchain that runs the same way for everyone who calls it. This gives three properties:

- **The agent cannot edit the rules.** The rules live outside the runtime of the agent and outside the model. A prompt injection cannot rewrite them.
- **Admins leave a trace.** A change to an access rule is a transaction on the chain. An admin cannot grant themselves access and then hide it.
- **One change applies everywhere.** When you revoke the access of a person, every agent and every data source sees the same answer on the next check.

Each access decision also creates a receipt. If a junior agent asks for a restricted node, Pavii blocks the read and records the attempt. Your security team sees the pattern in the observability view.

## Is an on-chain access check always necessary?

No. A small team with one app and trusted admins can use a normal policy engine. The access check needs to happen at query time for each user. Where the rules live is a second question.

An on-chain check becomes the right choice in these cases:

- Several teams or companies share one knowledge graph and do not share admins.
- An insider with admin rights is part of your threat model.
- Auditors or customers must verify who had read access to which data on a given date.
- You need one revocation to reach agents from different vendors at the same time.

## What about summaries and answers built from many sources?

An answer built from many sources is as sensitive as its most sensitive source. This is the rule that most retrieval systems break. A model can mix one restricted fact into a long summary, and the summary then goes into shared memory with a public label.

Give every derived item the strictest label of its inputs. Store the list of sources with the item. When the access of the user changes, check the derived items again, not only the original files. Pavii applies the privacy gate and the output gate before an answer leaves the system. A restricted fact does not reach a user who cannot see it.

## How does this connect to the rest of agent security?

Access control limits what an injected or confused agent can reach. It does not stop the injection itself, but it shrinks the damage. Combine it with the six Pavii gates: injection, privacy, supply chain, budget, egress and output. For more about rules that live outside the model, read [How do you make an AI agent follow rules after its context fills up?](/blog/ai-agent-rules-context-window/). For the base concepts, read the [agentic security guide](/blog/post-5/) and the Buckleson guide on [how to secure AI agents](https://buckleson.com/blog/how-to-secure-ai-agents/).

## Where should you start?

1. List every service account your agents use and the data each one can read.
2. Change the agents so that they pass the identity of the user to every tool.
3. Label every node in your index or graph with the access rules of its source.
4. Check access at query time, and give summaries the strictest label of their sources.
5. Move the access rules to a place the agent and single admins cannot change, such as a smart contract.
6. Test with a junior account: ask the agent for restricted data and confirm that it refuses.

To see how the Pavii company brain checks access on Hyper 0X, [book a call with the PAVii.AI team](https://cal.com/buckleson-group/30min).

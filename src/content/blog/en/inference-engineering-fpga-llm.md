---
title: 'How Do You Make LLM Inference Faster and Cheaper?'
description: 'Inference engineering for LLMs: model routing, small fine-tuned models, quantization, batching, caching, NPU and edge chips, and FPGA inference with trade-offs.'
author: 'PAVii.AI Security'
role: 'AI Safety and Platform Team'
authorImage: '@/images/blog/jacob.avif'
authorImageAlt: 'PAVii.AI security writer avatar'
pubDate: 2026-10-15
cardImage: '@/images/blog/post-1.avif'
cardImageAlt: 'LLM requests routed to small and large models on GPU, NPU and FPGA hardware'
readTime: 8
tags: ['inference engineering', 'llm inference', 'fpga', 'model routing', 'quantization', 'edge ai']
contents:
  - 'You make LLM inference faster and cheaper by sending less work to large models and doing the remaining work on the right hardware. Route each request to the smallest model that can do it. Shrink models with fine-tuning and quantization. Reuse work with batching and caching, and move steady tasks to NPU, edge or FPGA chips.'
  - 'This post explains each method, with its trade-offs. It also explains a common pattern for agents: a small tool-calling model that works with a larger reasoning model.'
faqs:
  - question: 'What is inference engineering?'
    answer: 'Inference engineering is the work to run trained AI models fast, at low cost and with steady quality. It covers model choice, routing, compression, serving software and hardware. It does not change how the model learns.'
  - question: 'Does quantization make an LLM less accurate?'
    answer: 'It can. Mild quantization usually keeps quality close to the original. Strong quantization saves more memory but can hurt hard tasks, so test it on your own workload.'
  - question: 'Can you run an LLM on an FPGA?'
    answer: 'Yes, for small models. A small, strongly quantized model can fit inside the FPGA and run with low power. Large general models do not fit, so they stay on GPUs or other accelerators.'
---

## What is inference engineering?

Inference is the step where a trained model answers a request. Training happens once. Inference happens every time a person or an agent sends a prompt. For most AI products, inference is the largest running cost.

Inference engineering is the work to make that step fast, cheap and steady. It has three levers. You can send less work to the model. You can make the model smaller. You can run the model on better hardware. Good teams use all three, in that order.

Our earlier post on [AI inference and model routing](/blog/post-1/) covers the basics. This post goes deeper into each lever.

## Why does model routing save the most?

Model routing means a small program reads each request and picks the model that will answer it. Most requests are simple: classify a ticket, pull a date from an email, format a list. A large general model can do them, but a small model can do them too, at a fraction of the cost.

A router sends simple tasks to small models and hard tasks to large models. It can also send a task back up when the small model reports low confidence. Routing works best when you can use many providers, so you do not depend on one vendor. See our post on [model-agnostic AI](/blog/post-7/).

Routing also cuts tokens. A token is a small unit of text that a model reads or writes. Pavii trims context and routes work to efficient models. Across 82K+ queries, Pavii saved 100M+ AI tokens. On one measured Claude Code task, agents used 30 to 60 percent fewer tokens.

## When does a small fine-tuned model beat a large one?

Fine-tuning means you train an existing model a little more on your own examples. A small model tuned on one narrow task can match a large general model on that task. It costs less to run, answers faster and can run on your own hardware.

Use a small tuned model when:

- The task is narrow and repeats often, for example invoice fields or support tags.
- You have a few thousand good examples.
- The answer always has the same format.
- Data must stay inside your network.

Keep a large model for open questions, new problems and long reasoning.

## How do quantization, batching and caching help?

**Quantization** stores model weights with fewer bits. A weight is one number that the model learned. A model with 4-bit weights needs about a quarter of the memory of the same model with 16-bit weights. Less memory means cheaper chips and faster reads. Strong quantization can lower quality, so test each level on your own tasks.

**Batching** runs many requests through the model at the same time. A GPU (graphics processing unit) does many sums in parallel, so a full batch costs little more than one request. Continuous batching adds new requests to a running batch as old ones finish.

**Caching** keeps work that you already did. A prompt cache stores the model state for a long shared prefix, such as a system prompt or a large document. The next request skips that part. A response cache returns a saved answer when the same question comes again.

## What do NPUs and edge inference add?

An NPU (neural processing unit) is a chip made for AI math. Many laptops and phones now include one. Edge inference means you run the model on the device or close to it, not in a far data center.

Edge inference has clear gains. The data does not leave the device, which helps privacy. There is no network round trip. There is no per-token bill. The limit is size: edge chips run small and quantized models, not the largest ones. Our post on [local-first AI assistants](/blog/post-6/) shows how this works for daily tools.

## How does FPGA inference work?

An FPGA (field-programmable gate array) is a chip with logic blocks that you can wire in any pattern after the chip leaves the factory. You describe a circuit, a tool turns it into a configuration file and the chip becomes that circuit. You can load a new configuration later.

The most extreme approach maps a whole small model into the FPGA logic. People call this "burning" the model into the chip. The weights sit in on-chip memory next to the logic that uses them. Each layer becomes a stage in a pipeline, and data flows through the stages like water through pipes. The chip does not fetch weights from outside memory for each token, which removes a major delay in normal inference.

## What are the trade-offs of FPGA inference?

| Factor | FPGA with a mapped model | GPU |
|---|---|---|
| Speed per request | Very fast, steady timing | Fast, varies with load |
| Power use | Low | High |
| Model size | Small, strongly quantized only | Small to very large |
| Model updates | New build of the circuit, slow | Load new weights, fast |
| Engineering effort | High, needs hardware skills | Low, many ready tools |
| Best fit | Fixed, high-volume, low-power tasks | General and changing workloads |

An FPGA is a good choice for a task that never changes and runs millions of times. It also fits places with little power, for example a sensor, a vehicle or a factory line. It is a poor choice when you change models every month. We treat it as a specialist option inside a wider inference plan, not as the default.

## Why pair a small tool-calling model with a large model?

Agents do two kinds of work. Most steps are mechanical: pick a tool, fill in its arguments in the correct format, read the result. A few steps need deep thought: plan a task, weigh options, write a final answer.

A strong pattern splits these roles:

1. A small model acts as router and tool caller. It reads the request, picks tools, formats calls and handles simple replies.
2. A large general model acts as the reasoner. The small model hands it hard steps, and the large model returns a plan or an answer.
3. The small model carries out the plan with tool calls and passes results back when needed.

Use the small model alone for fixed, well-defined tasks. Bring in the large model for open questions, conflicts in data or tasks with many steps. This pattern cuts cost and speeds up each step. It also helps security, because a small model with a narrow job is easier to test and limit. Put a gate in front of every tool call either way, as our [prevention playbook](/blog/how-to-prevent-ai-agent-attacks/) explains.

## Where should you start?

1. Measure your cost and time per request for each task type.
2. Sort tasks into simple, medium and hard.
3. Route simple tasks to small models and test the quality.
4. Turn on prompt caching and batching in your serving stack.
5. Try quantized models on your own test set before you move them to NPU, edge or FPGA hardware.
6. Look at [Pavii Compute](/products/compute/) for routing, efficient models and a context engine in one place.

Book a [30-minute call](https://cal.com/buckleson-group/30min) with the PAVii.AI team to plan a faster and cheaper inference stack.

# AI Agent CLI Tool — Scaler Academy Website Cloner

A conversational CLI agent that reasons through tasks step-by-step and clones the Scaler Academy website by generating production-quality HTML, CSS, and JavaScript.

## Demo

> Run the agent, type one instruction, watch it think and build the website live in your terminal.

## How It Works

The agent follows a strict reasoning loop:

```
START → THINK → THINK → TOOL → OBSERVE → TOOL → OBSERVE → OUTPUT
```

Each step is printed live in the terminal so you can watch the agent reason through the problem before taking any action.

## Features

- Conversational CLI — chat with the agent directly in the terminal
- Multi-step reasoning loop (never completes in one shot)
- 6 built-in tools: `generateScalerWebsite`, `createDirectory`, `writeFile`, `readFile`, `listFiles`, `executeCommand`
- Automatic rate-limit retry with exponential backoff
- Generates a fully working Scaler Academy clone with:
  - Sticky header with nav, Login and Placement Report buttons
  - Hero section with animated ticker, gradient headline, programs marquee, CTA buttons
  - Stats bar with animated counters (700+ companies, 50K+ alumni)
  - Programs section with 3 cards
  - Alumni testimonial section
  - 5-column footer

## Tech Stack

- **Runtime:** Node.js (ESM)
- **AI Model:** Llama 4 Scout via [Groq](https://console.groq.com) (free)
- **Output:** Pure HTML + CSS + JS (no frameworks)

## Setup

**1. Clone the repo**
```bash
git clone https://github.com/netram75/ai-agent-cli.git
cd ai-agent-cli
```

**2. Install dependencies**
```bash
npm install
```

**3. Get a free Groq API key**
- Go to [console.groq.com](https://console.groq.com)
- Sign up (free, no credit card needed)
- Create an API key

**4. Create `.env` file**
```
GROQ_API_KEY=your_key_here
```

**5. Run the agent**
```bash
npm start
```

## Usage

```
You: Clone the Scaler Academy website
```

The agent will reason through the task and generate `scaler_clone/index.html`, `styles.css`, and `script.js`. Open `scaler_clone/index.html` in your browser to see the result.

You can also ask it other things:
```
You: Create a folder called todo_app with a simple todo app in HTML CSS and JS
```

Type `exit` to quit.

## Project Structure

```
ai-agent-cli/
├── index.js          # Main agent — tools, loop, CLI
├── package.json
├── .env.example      # API key template
├── .gitignore
└── scaler_clone/     # Generated output
    ├── index.html
    ├── styles.css
    └── script.js
```

## Assignment

Built as Assignment 02 for the Scaler GenAI course — demonstrating an autonomous CLI agent with a reasoning loop, tool use, and real file output.

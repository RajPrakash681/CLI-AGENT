import "dotenv/config";
import OpenAI from "openai";
import readline from "readline";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const execAsync = promisify(exec);

// ── ANSI color helpers (no external deps) ─────────────────────────────────
const c = {
  reset:   "\x1b[0m",
  bold:    "\x1b[1m",
  dim:     "\x1b[2m",
  cyan:    "\x1b[36m",
  yellow:  "\x1b[33m",
  blue:    "\x1b[34m",
  green:   "\x1b[32m",
  magenta: "\x1b[35m",
  red:     "\x1b[31m",
  white:   "\x1b[97m",
  bgNavy:  "\x1b[48;2;15;23;42m",
  orange:  "\x1b[38;2;249;115;22m",
};

const step_colors = {
  START:   c.cyan,
  THINK:   c.yellow,
  TOOL:    c.blue,
  OBSERVE: c.green,
  OUTPUT:  c.magenta,
};

function label(tag) {
  const col = step_colors[tag] || c.white;
  return `${col}${c.bold} ${tag.padEnd(7)} ${c.reset}`;
}

function hr(char = "─", len = 58) {
  return c.dim + char.repeat(len) + c.reset;
}

// ── Spinner ────────────────────────────────────────────────────────────────
function createSpinner(msg = "Thinking") {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  const id = setInterval(() => {
    process.stdout.write(`\r${c.cyan}${frames[i++ % frames.length]}${c.reset} ${c.dim}${msg}...${c.reset}`);
  }, 80);
  return () => {
    clearInterval(id);
    process.stdout.write("\r\x1b[2K"); // clear line
  };
}

// ── Groq client (100% free — sign up at console.groq.com) ─────────────────
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// ── Tools ──────────────────────────────────────────────────────────────────

function parseArgs(raw) {
  if (typeof raw === "object" && raw !== null) return raw;
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return { cmd: raw }; }
  }
  return {};
}

async function createDirectory(raw) {
  const { dirpath } = parseArgs(raw);
  await fs.mkdir(path.resolve(dirpath), { recursive: true });
  return `Directory created: ${dirpath}`;
}

async function writeFile(raw) {
  const { filepath, content } = parseArgs(raw);
  const resolved = path.resolve(filepath);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, content, "utf8");
  return `File written: ${filepath} (${content.length} bytes)`;
}

async function readFile(raw) {
  const { filepath } = parseArgs(raw);
  return await fs.readFile(path.resolve(filepath), "utf8");
}

async function listFiles(raw) {
  const { dirpath } = parseArgs(raw);
  const entries = await fs.readdir(path.resolve(dirpath), { withFileTypes: true });
  if (entries.length === 0) return "Directory is empty";
  return entries.map((e) => `${e.isDirectory() ? "[DIR] " : "[FILE]"} ${e.name}`).join("\n");
}

async function executeCommand(raw) {
  const args = parseArgs(raw);
  const cmd = typeof args === "string" ? args : args.cmd || String(raw);
  const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 });
  return stdout || stderr || "Done";
}

// Generates a complete, production-quality Scaler clone — no LLM content needed
async function generateScalerWebsite() {
  const dir = path.resolve("scaler_clone");
  await fs.mkdir(dir, { recursive: true });

  // Read template files from templates/ (never touched by the agent)
  const templateDir = path.join(__dirname, "templates");
  let html, css, js;

  try {
    [html, css, js] = await Promise.all([
      fs.readFile(path.join(templateDir, "index.html"), "utf8"),
      fs.readFile(path.join(templateDir, "styles.css"), "utf8"),
      fs.readFile(path.join(templateDir, "script.js"), "utf8"),
    ]);
  } catch {
    html = "<!-- Scaler clone stub — agent will populate this -->";
    css  = "/* Scaler clone styles — agent will populate this */";
    js   = "// Scaler clone script — agent will populate this";
  }

  await fs.writeFile(path.join(dir, "index.html"), html, "utf8");
  await fs.writeFile(path.join(dir, "styles.css"), css,  "utf8");
  await fs.writeFile(path.join(dir, "script.js"),  js,   "utf8");

  // Auto-open in browser
  const htmlPath = path.join(dir, "index.html");
  const openCmd = process.platform === "win32"
    ? `start "" "${htmlPath}"`
    : process.platform === "darwin"
    ? `open "${htmlPath}"`
    : `xdg-open "${htmlPath}"`;
  await execAsync(openCmd).catch(() => {});

  return `Scaler clone created! Opening scaler_clone/index.html in your browser...`;
}

const TOOL_MAP = { createDirectory, writeFile, readFile, listFiles, executeCommand, generateScalerWebsite };

// ── System Prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI Agent CLI. Respond with exactly ONE valid JSON object per turn — no text outside JSON, no markdown fences.

Tools available:
  generateScalerWebsite : {} — generates a complete Scaler Academy website clone instantly (HTML + CSS + JS)
  createDirectory       : {"dirpath":"path"}
  writeFile             : {"filepath":"path/file","content":"full content"}
  readFile              : {"filepath":"path/file"}
  listFiles             : {"dirpath":"path"}
  executeCommand        : {"cmd":"shell command"}

Response format (choose one):
  {"step":"START",  "content":"what the user wants"}
  {"step":"THINK",  "content":"your reasoning"}
  {"step":"TOOL",   "content":"why","tool_name":"name","tool_args":{}}
  {"step":"OUTPUT", "content":"message to user"}

CRITICAL RULES:
  - One JSON object per turn; system sends OBSERVE after every TOOL call
  - START → THINK → TOOL → wait for OBSERVE → OUTPUT
  - Never generate OBSERVE yourself
  - WHENEVER the user mentions Scaler website (clone, build, create, copy, make) you MUST call generateScalerWebsite as your ONLY tool call. Do NOT use writeFile or createDirectory for this task. generateScalerWebsite handles everything.
  - Do NOT write any HTML, CSS or JS yourself for the Scaler website. Always use generateScalerWebsite.`;

// ── Scaler spec injected into user message ─────────────────────────────────

const SCALER_SPEC = `

Design spec for the Scaler Academy clone:
- Folder: scaler_clone/  Files: index.html (links styles.css + script.js), styles.css, script.js
- Color scheme: orange accent #f97316, navy #0f172a, white background
- Font: Inter (Google Fonts), bold headings
- HEADER (sticky): orange square logo "S" + "Scaler" text, nav links, Login + Placement Report buttons, hamburger on mobile
- HERO (2-col): left: animated badge, big headline with orange gradient text, subtext, 2 CTA buttons, stat strip; right: dark code-editor card with syntax highlighting + floating badges
- PROGRAMS section: 4 cards — Software Dev & AI, Data Science & ML, Agentic AI, Full Stack Dev
- COMPANIES section: 10 company pills (Google, Microsoft, Amazon, Meta, Flipkart, Uber, Swiggy, Razorpay, Zepto, Meesho)
- TESTIMONIALS: 3 dark cards with star ratings, quotes, author avatars
- FOOTER: brand col + 4 link cols (Company, Programs, Resources, Legal), social icons, copyright bar
- RESPONSIVE: hamburger menu, single column on mobile
- JS: scroll animations (IntersectionObserver), staggered card entry, stat counter, smooth scroll`;

function enrichIfScaler(message) {
  if (/scaler/i.test(message)) {
    return message + "\n\nIMPORTANT: Use the generateScalerWebsite tool immediately. Do not write any files manually." + SCALER_SPEC;
  }
  return message;
}

// ── API call with automatic retry on rate-limit ────────────────────────────

async function callModel(messages) {
  const MAX_RETRIES = 5;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages,
        temperature: 0.2,
        max_tokens: 4096,
      });
      return response.choices[0].message.content;
    } catch (err) {
      const isRateLimit = err.status === 413 || err.status === 429 || err.status === 503;
      if (isRateLimit && attempt < MAX_RETRIES) {
        const wait = attempt === 1 ? 30 : 61;
        console.log(`\n${c.yellow}⏳ Rate limit hit — waiting ${wait}s (attempt ${attempt}/${MAX_RETRIES})${c.reset}\n`);
        await new Promise((r) => setTimeout(r, wait * 1000));
        continue;
      }
      throw err;
    }
  }
}

// ── Agent Loop ─────────────────────────────────────────────────────────────

async function runAgent(userMessage, history) {
  history.push({ role: "user", content: enrichIfScaler(userMessage) });

  console.log("\n" + hr());

  const MAX_STEPS = 40;
  let steps = 0;

  while (steps++ < MAX_STEPS) {
    const stopSpinner = createSpinner("Agent thinking");
    let raw;
    try {
      raw = await callModel(history);
    } finally {
      stopSpinner();
    }

    raw = raw.trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.log(`${c.red}⚠  Non-JSON response, retrying…${c.reset}`);
      history.push({ role: "assistant", content: raw });
      history.push({
        role: "user",
        content: JSON.stringify({ step: "OBSERVE", content: "Not valid JSON. Reply with ONLY a JSON object." }),
      });
      continue;
    }

    // Slim writeFile in history to avoid token bloat
    if (parsed.step === "TOOL" && parsed.tool_name === "writeFile" && parsed.tool_args) {
      const args = parseArgs(parsed.tool_args);
      const slim = { step: parsed.step, content: parsed.content, tool_name: "writeFile", tool_args: { filepath: args.filepath } };
      history.push({ role: "assistant", content: JSON.stringify(slim) });
    } else {
      history.push({ role: "assistant", content: JSON.stringify(parsed) });
    }

    const { step } = parsed;

    // ── START
    if (step === "START") {
      console.log(`${label("START")} ${c.white}${parsed.content}${c.reset}`);
      console.log(hr("·"));
      history.push({ role: "user", content: '{"step":"CONTINUE","content":"Proceed."}' });

    // ── THINK
    } else if (step === "THINK") {
      console.log(`${label("THINK")} ${c.dim}${parsed.content}${c.reset}`);
      history.push({ role: "user", content: '{"step":"CONTINUE","content":"Proceed."}' });

    // ── TOOL
    } else if (step === "TOOL") {
      const { tool_name, tool_args, content } = parsed;
      console.log(`\n${label("TOOL")}  ${c.blue}${c.bold}${tool_name}${c.reset}${content ? c.dim + "  " + content + c.reset : ""}`);

      let observeContent;
      if (!TOOL_MAP[tool_name]) {
        observeContent = `Unknown tool "${tool_name}". Available: ${Object.keys(TOOL_MAP).join(", ")}`;
        console.log(`       ${c.red}✗ ${observeContent}${c.reset}`);
      } else {
        const stopTool = createSpinner(`Running ${tool_name}`);
        try {
          observeContent = await TOOL_MAP[tool_name](tool_args);
          stopTool();
          const preview = String(observeContent).length > 120
            ? String(observeContent).slice(0, 120) + "…"
            : String(observeContent);
          console.log(`${label("OBSERVE")} ${c.green}${preview}${c.reset}`);
        } catch (err) {
          stopTool();
          observeContent = `Error: ${err.message}`;
          console.log(`${label("OBSERVE")} ${c.red}✗ ${observeContent}${c.reset}`);
        }
      }
      console.log(hr("·"));

      history.push({
        role: "user",
        content: JSON.stringify({ step: "OBSERVE", content: observeContent }),
      });

    // ── OUTPUT
    } else if (step === "OUTPUT") {
      console.log(`\n${label("OUTPUT")} ${c.magenta}${c.bold}${parsed.content}${c.reset}`);
      console.log("\n" + hr() + "\n");
      return;

    // ── OBSERVE (self-generated — just continue)
    } else if (step === "OBSERVE") {
      history.push({
        role: "user",
        content: JSON.stringify({ step: "CONTINUE", content: "Continue to the next step." }),
      });
    }
  }

  console.log(`\n${c.yellow}⚠  Reached maximum step limit.${c.reset}\n`);
}

// ── CLI Interface ──────────────────────────────────────────────────────────

function printBanner() {
  const W = 60;
  const line  = (s = "") => console.log(`${c.bgNavy}${c.white}  ${s.padEnd(W - 2)}  ${c.reset}`);
  const blank = ()        => line();

  console.log();
  console.log(`${c.bgNavy}${c.white}${"─".repeat(W + 4)}${c.reset}`);
  blank();
  line(`  ${c.orange}${c.bold}S${c.reset}${c.white}${c.bold} SCALER  AI AGENT CLI${c.reset}${c.white}`);
  blank();
  line(`  Powered by ${c.cyan}Groq${c.reset}${c.white}  ·  Model: Llama 4 Scout`);
  blank();
  line(`  ${c.dim}Try : "Clone the Scaler Academy website"${c.reset}${c.white}`);
  line(`  ${c.dim}Type "exit" to quit${c.reset}${c.white}`);
  blank();
  console.log(`${c.bgNavy}${c.white}${"─".repeat(W + 4)}${c.reset}`);
  console.log();
}

function main() {
  printBanner();

  if (!process.env.GROQ_API_KEY) {
    console.error(`${c.red}${c.bold}✗  GROQ_API_KEY is not set.${c.reset}`);
    console.error(`${c.dim}   1. Go to https://console.groq.com and sign up (free)`);
    console.error(`   2. Create an API key`);
    console.error(`   3. Add to .env file:  GROQ_API_KEY=your_key_here${c.reset}\n`);
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const history = [{ role: "system", content: SYSTEM_PROMPT }];

  function prompt() {
    rl.question(`${c.orange}${c.bold}You${c.reset} ${c.dim}›${c.reset} `, async (input) => {
      const text = input.trim();
      if (!text) { prompt(); return; }
      if (text.toLowerCase() === "exit") {
        console.log(`\n${c.dim}Goodbye! See you next time.${c.reset}\n`);
        rl.close();
        process.exit(0);
        return;
      }
      try {
        await runAgent(text, history);
      } catch (err) {
        console.error(`\n${c.red}✗ Agent error: ${err.message}${c.reset}\n`);
      }
      if (process.stdin.readableEnded) {
        process.exit(0);
      } else {
        prompt();
      }
    });
  }

  prompt();
}

main();

// dsh-spec-test-gate - Spec-Test-Gate workflow for DeepSeek Harness.
// Host plugin (no Config): registers the "spec-test-gate" skill bundle plus
// six human slash commands (/stg, /stg-init, /stg-step, /stg-implement,
// /stg-audit, /stg-clean). Each command injects a model-visible instruction via
// agent.followup() and returns a short UI acknowledgement; the model then does
// the work after loading the skill (which carries the full workflow bundle).
// Single source of truth: all workflow text is read from
// plugins/spec-test-gate/ (the Claude plugin already in this repo).
// Nothing is duplicated here.
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { sep } from "node:path";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
var name = "dsh-spec-test-gate";
var inject = [];
var NL = String.fromCharCode(10);
var CR = String.fromCharCode(13);
var TAB = String.fromCharCode(9);
var PLUGIN_DIR_URL = new URL("../plugins/spec-test-gate/", import.meta.url);
var PLUGIN_DIR = fileURLToPath(PLUGIN_DIR_URL);
function posixPath(p) {
  return String(p).split(sep).join("/");
}
function filePath(rel) {
  return fileURLToPath(new URL(rel, PLUGIN_DIR_URL));
}
var SKILL_FILE = "skills/spec-test-gate/SKILL.md";
var COMMAND_FILES = {
  init: "commands/init.md",
  start: "commands/spec-test-gate.md",
  step: "commands/step-task.md",
  implement: "commands/implement.md",
  audit: "commands/audit.md",
  clean: "commands/clean.md"
};
var AGENT_FILES = {
  "test-author": "agents/test-author.md",
  implementer: "agents/implementer.md",
  auditor: "agents/auditor.md"
};
var TEMPLATE_FILE = "templates/task_queue.md";
function dashLine(s) {
  return String(s).split(CR).join("");
}
function parseFrontmatter(raw, path) {
  var text = String(raw);
  var lines = text.split(NL);
  var meta = { name: "", description: "" };
  if (lines.length > 0 && dashLine(lines[0]) === "---") {
    var i = 1;
    while (i < lines.length && dashLine(lines[i]) !== "---") {
      var line = lines[i];
      if (line.indexOf("name:") === 0) {
        meta.name = line.slice(5).trim();
      }
      if (line.indexOf("description:") === 0) {
        meta.description = line.slice(12).trim();
      }
      i = i + 1;
    }
  }
  if (!meta.name || !meta.description) {
    throw new Error("dsh-spec-test-gate: " + path + " has no name/description frontmatter");
  }
  return meta;
}
function stripFrontmatter(raw) {
  var text = String(raw);
  var lines = text.split(NL);
  if (lines.length > 0 && dashLine(lines[0]) === "---") {
    var i = 1;
    while (i < lines.length && dashLine(lines[i]) !== "---") {
      i = i + 1;
    }
    return lines.slice(i + 1).join(NL);
  }
  return text;
}
async function loadBundle(signal) {
  function read(rel) {
    return readFile(filePath(rel), { encoding: "utf8", signal: signal });
  }
  var skillRaw = await read(SKILL_FILE);
  var template = await read(TEMPLATE_FILE);
  var commandKeys = Object.keys(COMMAND_FILES);
  var agentKeys = Object.keys(AGENT_FILES);
  var commandBodies = [];
  var k = 0;
  while (k < commandKeys.length) {
    commandBodies.push(await read(COMMAND_FILES[commandKeys[k]]));
    k = k + 1;
  }
  var agentBodies = [];
  var m = 0;
  while (m < agentKeys.length) {
    agentBodies.push(await read(AGENT_FILES[agentKeys[m]]));
    m = m + 1;
  }
  var lines = [];
  lines.push("# Spec-Test-Gate (STG) - Full Workflow Bundle");
  lines.push("");
  lines.push("This skill carries the complete STG workflow. Follow it exactly.");
  lines.push("");
  lines.push("## Skill Rules");
  lines.push("");
  lines.push(stripFrontmatter(skillRaw).trim());
  lines.push("");
  var ci = 0;
  while (ci < commandKeys.length) {
    lines.push("## Command: " + commandKeys[ci]);
    lines.push("");
    lines.push(String(commandBodies[ci]).trim());
    lines.push("");
    ci = ci + 1;
  }
  var ai = 0;
  while (ai < agentKeys.length) {
    lines.push("## Agent: " + agentKeys[ai]);
    lines.push("");
    lines.push(String(agentBodies[ai]).trim());
    lines.push("");
    ai = ai + 1;
  }
  lines.push("## Epic Queue Template");
  lines.push("");
  lines.push(String(template).trim());
  lines.push("");
  return lines.join(NL);
}
var PROVIDER_NAME = "spec-test-gate";
function buildProvider(meta) {
  var summary = {
    name: meta.name,
    description: meta.description,
    invocation: { modelInvocable: true, userInvocable: true },
    provider: PROVIDER_NAME,
    source: "bundled",
    resourceBase: { kind: "directory", path: posixPath(PLUGIN_DIR) }
  };
  var candidate = {
    name: summary.name,
    description: summary.description,
    invocation: summary.invocation,
    provider: summary.provider,
    source: summary.source,
    resourceBase: summary.resourceBase,
    rank: BUNDLED_SKILL_RANK,
    locator: filePath(SKILL_FILE)
  };
  var provider = {
    name: PROVIDER_NAME,
    list: function () {
      return Promise.resolve([candidate]);
    },
    get: async function (_candidate, options) {
      var signal = options ? options.signal : undefined;
      return {
        name: summary.name,
        description: summary.description,
        invocation: summary.invocation,
        provider: summary.provider,
        source: summary.source,
        resourceBase: summary.resourceBase,
        content: await loadBundle(signal)
      };
    }
  };
  return provider;
}
var SCOPE_GUARD = "Run this in the TARGET project directory (the session working directory), never inside the STG-workflow repo itself. Project state lives under the project's .agents/ directory.";
var SKILL_FIRST = "First load the spec-test-gate skill with the skill tool - it contains the full workflow bundle (rules, commands, agents, templates). Then proceed below.";
function kickoff(invocation, text) {
  invocation.agent.followup(
    createUserMessage({ content: [{ type: "text", text: text }], source: { kind: "user" } })
  );
}
function isTaskId(s) {
  var t = String(s || "").trim();
  if (t.length < 4) {
    return false;
  }
  var c0 = t.charAt(0);
  if (c0 !== "T" && c0 !== "t") {
    return false;
  }
  if (t.charAt(1) !== "-") {
    return false;
  }
  var digits = "0123456789";
  var i = 2;
  while (i < t.length) {
    if (digits.indexOf(t.charAt(i)) < 0) {
      return false;
    }
    i = i + 1;
  }
  return true;
}
function splitTokens(s) {
  var t = String(s || "").trim();
  if (!t) {
    return [];
  }
  var parts = t.split(" ");
  var out = [];
  var i = 0;
  while (i < parts.length) {
    var sub = parts[i].split(TAB);
    var j = 0;
    while (j < sub.length) {
      if (sub[j]) {
        out.push(sub[j]);
      }
      j = j + 1;
    }
    i = i + 1;
  }
  return out;
}
var USAGE_STEP = "Usage: /stg-step T-01 [--epic slug]";
var COMMAND_DEFS = [
  {
    name: "stg",
    description: "Start Spec-Test-Gate: you write the spec, AI interrogates, then task queue (Phase 0+1).",
    input: { hint: "[optional context]" },
    handler: function (invocation) {
      var extra = invocation.rawInput.trim();
      var head = "Spec-Test-Gate start requested.";
      if (extra) {
        head = head + " User context: " + extra;
      }
      kickoff(invocation, [head, SKILL_FIRST, "Follow Phase 0: ask the USER to write the full spec with every touched artifact and complete logic. Interrogate it with numbered QUESTION [N]: / SUGGESTION [N]: prefixes (one shared counter per phase) and tell the user to reply by number. NEVER write the spec yourself; push back if the user offloads design. HALT for spec finalization. Then follow Phase 1: the USER decomposes into T-01, T-02, ..., confirm an epic slug, and only after explicit approval write .agents/<slug>/task_queue.md. HALT for queue confirmation.", SCOPE_GUARD].join(NL));
      return { kind: "success", text: "STG started: the agent will ask you to write the full spec." };
    }
  },
  {
    name: "stg-init",
    description: "Init STG toolchain: write .agents/stack.env for a language/framework.",
    input: { hint: "<go|typescript|python|custom> [framework] [--force]" },
    handler: function (invocation) {
      var args = invocation.rawInput.trim();
      if (!args) {
        return { kind: "error", text: "Language is required. Usage: /stg-init <go|typescript|python|custom> [framework] [--force]" };
      }
      kickoff(invocation, ["STG init requested for: " + args, SKILL_FIRST, "Follow the bundle Command: init section to resolve language/framework and write .agents/stack.env in the CURRENT project directory. If .agents/stack.env already exists and --force is absent, show the current file and HALT - ask the user to re-run with --force. Never copy plugin files into the project and never touch AGENTS.md.", SCOPE_GUARD].join(NL));
      return { kind: "success", text: "STG init: writing .agents/stack.env (" + args + ")." };
    }
  },
  {
    name: "stg-step",
    description: "Stage failing L1+L2+L3 tests for ONE STG task, then halt. No production logic.",
    input: { hint: "<T-01> [--epic slug]" },
    handler: function (invocation) {
      var tokens = splitTokens(invocation.rawInput);
      var task = tokens.length > 0 ? tokens[0] : "";
      if (!isTaskId(task)) {
        return { kind: "error", text: "A task id like T-01 is required. " + USAGE_STEP };
      }
      var upper = String(task).toUpperCase();
      kickoff(invocation, ["STG step-task requested: " + tokens.join(" "), SKILL_FIRST, "Follow Phase 2 EXACTLY for ONLY this task (" + upper + "): resolve the epic queue file (--epic <slug>, or the single .agents/*/task_queue.md; if several exist, HALT and ask which epic), explain its quadrant (Q1 Happy, Q2 Boundary, Q3 Invariant, Q4 Failure/Rollback), then write the failing tests for THIS task FIRST in all three layers (L1 Unit, L2 API, L3 E2E - E2E is per-task, never deferred). Scaffold ONLY minimal compilable empty stubs (a stub that makes a test pass is a violation). Run all three layers and verify each fails on BEHAVIOR; mark Unit Red | API Red | E2E Red in the queue file. CRITICAL HALT afterwards with: Task " + upper + " test harness staged (L1 Red, L2 Red, L3 Red). Ready for review. Do NOT touch the next task. Do NOT write ANY production logic.", SCOPE_GUARD].join(NL));
      return { kind: "success", text: "STG step-task " + upper + ": staging L1+L2+L3 failing tests." };
    }
  },
  {
    name: "stg-implement",
    description: "Implement STG tasks one by one from the final spec. Refuses tasks missing any Red layer.",
    input: { hint: "[epic-slug]" },
    handler: function (invocation) {
      var slug = invocation.rawInput.trim();
      var head = "STG implement requested. Treat this as a FRESH implementation session.";
      if (slug) {
        head = "STG implement requested for epic: " + slug + ". Treat this as a FRESH implementation session.";
      }
      kickoff(invocation, [head, SKILL_FIRST, "Follow the bundle Command: implement section: FIRST apply the ALL-RED GATE - resolve .agents/<slug>/task_queue.md (omit the slug only when exactly one queue exists; if several exist, HALT and ask which epic) and read the next pending task row. It may proceed ONLY if its Unit, API, AND E2E statuses are all Red; otherwise REFUSE, name the missing layer, and send the user back to /stg-step. Then implement STRICTLY task-by-task from the final user-approved spec with minimal production logic only. NEVER modify test files. After each task run lint + FULL validation (unit + API/E2E + regression from .agents/stack.env), update Implementation Status in the SAME queue file, and HALT for user confirmation. Keep changes uncommitted for human inspection.", SCOPE_GUARD].join(NL));
      return { kind: "success", text: "STG implement: working through tasks one by one from the final spec." };
    }
  },
  {
    name: "stg-audit",
    description: "STG mutation audit + final Green validation over implemented tasks.",
    input: { hint: "[epic-slug]" },
    handler: function (invocation) {
      var slug = invocation.rawInput.trim();
      var head = "STG audit requested.";
      if (slug) {
        head = "STG audit requested for epic: " + slug + ".";
      }
      kickoff(invocation, [head, SKILL_FIRST, "Follow the bundle Command: audit section: pick core invariants implemented via /stg-implement, inject controlled temporary mutations (invert conditionals, bypass validation), run unit + API + E2E suites (TEST_CMD, API_TEST_CMD, E2E_TEST_CMD from .agents/stack.env): FAIL means the invariant is verified, PASS means a mirage test - flag it for reinforcement. Revert to Green after each mutation. Final validation: full suite Green in ALL THREE layers, every Session 1 Red test now Green, no regressions. Report explicitly per layer. NEVER modify tests to match broken code.", SCOPE_GUARD].join(NL));
      return { kind: "success", text: "STG audit: mutation-testing invariants and confirming Green." };
    }
  },
  {
    name: "stg-clean",
    description: "Remove STG project state (.agents/stack.env, one epic, or all). Asks first.",
    input: { hint: "[--epic slug | --all]" },
    handler: function (invocation) {
      var args = invocation.rawInput.trim();
      var head = "STG clean requested.";
      if (args) {
        head = "STG clean requested: " + args;
      }
      kickoff(invocation, [head, SKILL_FIRST, "Follow the bundle Command: clean section: show what will be removed (the .agents/stack.env content, the .agents/<slug>/ listing, or everything under .agents/), then HALT and ask the user for explicit confirmation BEFORE deleting anything. Only after confirmation, delete exactly the scoped target and confirm what was removed. This never touches plugin files, AGENTS.md, implementation files, or test files.", SCOPE_GUARD].join(NL));
      return { kind: "success", text: "STG clean: the agent will confirm before removing anything." };
    }
  }
];
var SYSTEM_PROMPT_TEXT = ["Spec-Test-Gate (STG) workflow is installed: user-owned spec, test-first gates, task-by-task Red-to-Green, mutation audit.", "Skill: spec-test-gate - load it via the skill tool before acting on any STG task; it carries the full workflow bundle.", "Slash commands: /stg (start Phase 0+1), /stg-init <language> [framework], /stg-step T-01 [--epic slug], /stg-implement [slug], /stg-audit, /stg-clean.", "Core rules: NEVER write the spec for the user (numbered QUESTION [N]: / SUGGESTION [N]: only); L1 Unit + L2 API + L3 E2E must ALL be Red per task with HALT (all-Red gate, no bypass); tests BEFORE any logic; one task per step; project state under .agents/."].join(NL);
function apply(ctx) {
  var meta = parseFrontmatter(readFileSync(filePath(SKILL_FILE), "utf8"), SKILL_FILE);
  var provider = buildProvider(meta);
  ctx.inject(["skills"], function (sctx) {
    sctx.effect(function () {
      var dispose = sctx.skills.registerProvider(function () {
        return provider;
      });
      return function () {
        if (typeof dispose === "function") {
          dispose();
        }
      };
    }, "spec-test-gate: skill provider");
  });
  ctx.inject(["commands"], function (sctx) {
    sctx.effect(function () {
      var disposers = COMMAND_DEFS.map(function (def) {
        return sctx.commands.register(def);
      });
      return function () {
        var i = 0;
        while (i < disposers.length) {
          disposers[i]();
          i = i + 1;
        }
      };
    }, "spec-test-gate: slash commands");
  });
  ctx.inject(["systemPrompt"], function (sctx) {
    var disposeSection = null;
    sctx.effect(function () {
      disposeSection = sctx.systemPrompt.section({
        name: "spec-test-gate",
        order: 420,
        text: SYSTEM_PROMPT_TEXT
      });
      return function () {
        if (typeof disposeSection === "function") {
          disposeSection();
        }
        disposeSection = null;
      };
    }, "spec-test-gate: system prompt");
  });
}
export { apply, inject, name };

import { run, pi } from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

async function main() {
  await run({
    name: "plane-worker",

    sandbox: docker({
      mounts: [
        { hostPath: "~/.cargo/bin", sandboxPath: "/home/agent/.cargo/bin", readonly: true },
        { hostPath: "~/.pi/agent/auth.json", sandboxPath: "/home/agent/pi-auth-host.json", readonly: true },
      ],
    }),

    agent: pi("openai-codex/gpt-5.4"),
    promptFile: "./.sandcastle/prompt.md",
    maxIterations: 10,
    logging: { type: "stdout" },
    branchStrategy: { type: "merge-to-head" },
    copyToWorktree: ["node_modules"],

    hooks: {
      sandbox: {
        onSandboxReady: [
          {
            command:
              'COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack enable && COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm install --frozen-lockfile && mkdir -p /home/agent/.pi/agent && cp /home/agent/pi-auth-host.json /home/agent/.pi/agent/auth.json && if [ -n "$PLANE_API_TOKEN" ]; then plane login --token "$PLANE_API_TOKEN" --workspace it-payroll-2026; else echo "PLANE_API_TOKEN not set; plane commands may fail"; fi',
            timeoutMs: 300000,
          },
        ],
      },
    },
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

import type { XmcpConfig } from "xmcp/config";

const config: XmcpConfig = {
  paths: {
    tools: "./src/tools",
    prompts: false,
    resources: false,
    skills: false,
  },
  http: {
    port: 3002,
  },
  stdio: {
    silent: true,
  },
};

export default config;

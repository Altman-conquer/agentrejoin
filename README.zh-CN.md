<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="/.github/logotype-light.png">
    <source media="(prefers-color-scheme: light)" srcset="/.github/logotype-dark.png">
    <img src="/.github/logotype-dark.png" width="440" alt="AgentRejoin">
  </picture>

  <h1>随时回到你的 Coding Agent 对话</h1>

  <p>
    找到服务器上已有的 Claude Code 和 Codex 对话，<br>
    恢复原始上下文，再从网页或手机继续工作。
  </p>

  <p>
    <a href="https://agentrejoin.zhandj.com/app"><strong>打开 Web 应用</strong></a>
    · <a href="https://agentrejoin.zhandj.com">产品官网</a>
    · <a href="README.md">English</a>
  </p>
</div>

<img width="1600" height="900" alt="AgentRejoin 网页端与手机端产品界面" src="/.github/header.png" />

## AgentRejoin 能做什么

- **发现已有对话**：浏览连接服务器上已经存在的 Coding Agent 对话。
- **恢复原始上下文**：重新进入原来的 Claude Code 会话或 Codex 线程，并保留工作目录与历史记录。
- **跨设备继续**：通过网页或手机查看进度、回复消息、批准工具调用。
- **及时获得通知**：当 Agent 需要授权或完成任务时收到提醒。
- **端到端加密**：对话消息在到达 Relay 前完成加密。
- **支持自行部署**：可以在自己的基础设施上运行 Relay 与 Web 应用。

## 快速开始

安装 AgentRejoin CLI 并连接当前机器：

```bash
npm install -g agentrejoin
agentrejoin auth login
agentrejoin daemon start
```

通过已连接的 CLI 运行 Agent：

```bash
agentrejoin claude
agentrejoin codex
agentrejoin gemini       # 上游已弃用，建议使用 agy
agentrejoin openclaw
agentrejoin agy          # Antigravity CLI
agentrejoin acp opencode # 任意受支持的 ACP Agent
```

| Agent CLI | 可启动并远程控制 | 可发现本地已有历史 |
| --- | --- | --- |
| Claude Code | 是 | 是 |
| Codex | 是 | 是 |
| Gemini | 是 | 是 |
| OpenClaw | 是 | 否 |
| Antigravity (`agy`) | 是 | 否 |
| 兼容 ACP 的 Agent | 是 | 否 |

现有历史会话的自动发现目前支持 Claude Code、Codex 和 Gemini。其他集成
提供实时会话控制，但没有稳定的本地历史格式可供扫描。

从终端恢复已知会话：

```bash
agentrejoin resume <session-id>
```

使用远程控制 CLI：

```bash
npm install -g agentrejoin-agent
agentrejoin-agent auth login
agentrejoin-agent machines
agentrejoin-agent list
agentrejoin-agent resume <session-id>
```

## 工作原理

服务器 daemon 会索引该机器上受支持的 Coding Agent 会话。网页或移动客户端通过加密 Relay 请求恢复会话，daemon 随后重新接入原 Claude Code 会话或 Codex 线程，并把新消息同步到客户端。Relay 负责传输加密数据，但无法读取对话内容。

## 仓库结构

- `packages/agentrejoin-app`：Expo 网页与移动客户端，以及 Tauri 桌面外壳
- `packages/agentrejoin-cli`：Coding Agent 运行时与服务器 daemon
- `packages/agentrejoin-agent`：远程会话控制 CLI
- `packages/agentrejoin-server`：加密同步 Relay
- `packages/agentrejoin-server-self-host`：自行部署的 Relay 与 Web 应用

## 本地开发

```bash
pnpm install
pnpm --filter agentrejoin-app web
```

提交前运行核心检查：

```bash
pnpm --filter agentrejoin-app typecheck
pnpm --filter agentrejoin typecheck
pnpm --filter agentrejoin-agent typecheck
```

## 开源协议

[GNU AGPL v3](LICENSE)。第三方版权声明保留在 [NOTICE](NOTICE) 中。

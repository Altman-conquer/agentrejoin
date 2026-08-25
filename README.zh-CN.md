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

产品名称为 AgentRejoin。为保持现有生态兼容，当前发布的 CLI 命令仍为 `happy` 和 `happy-agent`。

```bash
npm install -g happy
happy auth login
happy daemon start
```

通过已连接的 CLI 运行 Agent：

```bash
happy claude
happy codex
```

从终端恢复已知会话：

```bash
happy resume <session-id>
```

使用远程控制 CLI：

```bash
happy-agent auth login
happy-agent machines
happy-agent list
happy-agent resume <session-id>
```

## 工作原理

服务器 daemon 会索引该机器上受支持的 Coding Agent 会话。网页或移动客户端通过加密 Relay 请求恢复会话，daemon 随后重新接入原 Claude Code 会话或 Codex 线程，并把新消息同步到客户端。Relay 负责传输加密数据，但无法读取对话内容。

## 仓库结构

- `packages/happy-app`：Expo 网页与移动客户端，以及 Tauri 桌面外壳
- `packages/happy-cli`：Coding Agent 运行时与服务器 daemon
- `packages/happy-agent`：远程会话控制 CLI
- `packages/happy-server`：加密同步 Relay
- `packages/happy-server-self-host`：自行部署的 Relay 与 Web 应用

## 本地开发

```bash
pnpm install
pnpm --filter happy-app web
```

提交前运行核心检查：

```bash
pnpm --filter happy-app typecheck
pnpm --filter happy-cli typecheck
pnpm --filter happy-agent typecheck
```

## 开源协议

[GNU AGPL v3](LICENSE)。Happy 上游项目的 MIT 声明保留在 [NOTICE](NOTICE) 中。

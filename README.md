# WalletConnect Verify · 四种 tag 测试用例

给安全团队的测试桩：用 WalletConnect 底层 Sign Client 复现 `verifyResult` 的四种取值
`unknown | valid | invalid | scam`，并把 verifyContext 的原始结构（origin / validation /
verifyUrl / isScam）完整 dump 出来，用于对照线上接口 `/wallet-direct/buw/security/common-check`
新增的 `verifyResult` 参数。

> 来源：Confluence《WalletConnect Verify 结果接入》(pageId=585704309, CSR 空间)

---

## 1. 四种 tag 怎么被 connect 触发（机制）

WalletConnect Verify 在 connect 阶段（以及后续 session_request / session_authenticate）由
**verify server** 校验请求来源域名，结果通过 `verifyContext` 随事件回传给钱包端。

### 关键事实

- 真正参与校验的 **origin 是浏览器/SDK 通过 HTTP `Origin` header 自动带上的**，
  **不是 dapp 在 `metadata.url` 里自填的**。`metadata.url` 仅用于钱包 UI 展示。
- 校验基准是 **该 projectId 在 WalletConnect Cloud Dashboard 配置的 origin allowlist**。
  allowlist 格式 `https://example.com` / `https://*.example.com`，约 15 分钟生效，
  `localhost` 永远放行，**空 allowlist = 无法验证**。
- `verifyContext.verified` 的权威结构（`@walletconnect/types`）只有四个字段：

  ```ts
  verified: {
    origin: string;                              // 请求真实来源域名
    validation: "UNKNOWN" | "VALID" | "INVALID"; // 只有三个值
    verifyUrl: string;                            // verify server 地址
    isScam?: boolean;                             // 独立布尔位，可叠加在任意 validation 上
  }
  ```

### 四种 verifyResult 触发条件

| verifyResult | 触发条件 |
|---|---|
| `valid`   | 真实 origin ∈ 该 projectId 的 allowlist，且未被安全情报源标记 |
| `invalid` | 真实 origin ∉ allowlist（origin 与登记域名不匹配），且未被标记 |
| `unknown` | 该 projectId 未配 allowlist（无法验证），且未被标记 |
| `scam`    | origin 被合作的安全情报源标记为恶意 → `isScam=true`（独立于 validation，优先级最高） |

映射逻辑（见 `src/wc.ts` 的 `toVerifyResult`）：
`isScam===true → scam`，否则 `validation → valid / invalid / unknown`。

### 带有 verifyContext 的三个事件

`session_proposal`（连接时）、`session_request`（签名时）、`session_authenticate`。
本桩监听并记录全部三类。

---

## 2. 四个测试用例配置矩阵

用「同一套站点代码 + 不同 projectId + 不同部署域名」覆盖四种状态。
**valid / invalid / unknown 三态依赖 Dashboard allowlist + 请求 origin；scam 依赖情报源标记。**
请你在 WalletConnect Cloud Dashboard 创建 4 个项目并按下表配置：

| 用例 | projectId（环境变量） | Dashboard allowlist | 部署到的域名（HTTP Origin） | 预期 verifyResult |
|---|---|---|---|---|
| Case 1 valid   | `VITE_PID_VALID`   | `https://valid.example.com`（精确匹配） | `https://valid.example.com` | `valid` |
| Case 2 invalid | `VITE_PID_INVALID` | `https://declared.example.com`（与部署域名不一致） | `https://invalid.example.com` | `invalid` |
| Case 3 unknown | `VITE_PID_UNKNOWN` | （留空，不配 allowlist） | `https://unknown.example.com` | `unknown` |
| Case 4 scam    | `VITE_PID_SCAM`    | 任意；关键是该域名需被情报源标记为恶意 | 已被情报源标记的域名 | `scam` |

> 把 4 个 projectId 填入 `.env.local`：
> ```
> VITE_PID_VALID=xxxx
> VITE_PID_INVALID=yyyy
> VITE_PID_UNKNOWN=zzzz
> VITE_PID_SCAM=wwww
> ```
> 未填会用占位符 `PUT_*_PROJECT_ID`，UI 会提示「先填真实 projectId 才能连接」。

### 关于 scam 用例的现实难点

`scam` 需要域名被 WalletConnect 合作的安全情报源标记。若手头没有已标记的域名，
本桩提供 **mock 开关**：访问时带 `?mockScam=1`，会在收到 verifyContext 后本地把
`isScam` 置为 `true`，仅用于演示 scam 分支的 UI（事件历史里会标 `*` 表示 mock），
**不影响真实 verify 链路**。是否使用 mock 由安全团队定；真实验收请用真实被标记域名。

---

## 3. 本地运行

```bash
npm install
npm run dev        # http://localhost:5173
```

- 顶部 4 个 tab 切换用例，每个 tab 显示该用例的 projectId / 建议部署域名 / allowlist 配置 / 触发原因。
- 点「发起连接」生成 WC URI 二维码，用钱包扫描。
- 钱包收到 `session_proposal` 后，本桩会把 `verifyContext` 完整 dump 在右侧面板，
  并推导出 `verifyResult`，与期望值并排显示。
- 右侧事件历史记录 `session_proposal / session_request / session_authenticate`，可点选切换查看。

### 部署到不同域名（用 4 个 GitHub Pages 仓库复现四种 tag）

产物是纯静态包。为复现 valid / invalid / unknown / scam，把同一份 `dist/` 部署到 **4 个不同 origin**
（GitHub Pages 默认域名 `https://<user>.github.io/<repo>`，每个仓库名不同 → origin 不同），
每个仓库的构建里注入对应的 projectId，并在 Dashboard 按 2 节矩阵配 allowlist。

| 用例 | 仓库 | 部署 origin | 注入的 projectId 环境变量 |
|---|---|---|---|
| Case 1 valid   | `web_connect1` | `https://<user>.github.io/web_connect1` | `VITE_PID_VALID` |
| Case 2 invalid | `web_connect2` | `https://<user>.github.io/web_connect2` | `VITE_PID_INVALID` |
| Case 3 unknown | `web_connect3` | `https://<user>.github.io/web_connect3` | `VITE_PID_UNKNOWN` |
| Case 4 scam    | `web_connect4` | `https://<user>.github.io/web_connect4` | `VITE_PID_SCAM` |

每个仓库单独构建并只注入自己那一个 projectId（其余留空）：

```bash
# 例如 Case 1
VITE_PID_VALID=<PID-A> npm run build
# 把 dist/ 推到 web_connect1 仓库的 gh-pages 分支，启用 GitHub Pages
```

> 同一份代码、不同 origin + 不同 projectId（+ 不同 allowlist 配置）即可分别命中四种 verifyResult。
> 本地 `localhost` 因 WalletConnect 永远放行，无法直接复现 invalid/unknown，仅供联调。
> scam 用例需 web_connect4 的 origin 已被情报源标记，否则用 `?mockScam=1` 做 UI 演示。

---

## 4. 与线上接口对照

线上 `/wallet-direct/buw/security/common-check` 新增：

```
verifyResult: "unknown" | "valid" | "invalid" | "scam"   (String, 必填)
```

本桩推导的 `verifyResult` 与该枚举完全一致：

| verifyContext.verified | → verifyResult |
|---|---|
| `validation=VALID` & `isScam!=true` | `valid` |
| `validation=INVALID` & `isScam!=true` | `invalid` |
| `validation=UNKNOWN` & `isScam!=true` | `unknown` |
| `isScam=true`（任意 validation） | `scam` |

> 注：WalletConnect 后续若给 `validation` 增加其他枚举值，`toVerifyResult` 的 fallback 落到 `unknown`，
> 需按 Confluence 文档「WalletConnect 后续增加其他枚举值也需同步支持」同步扩展。

---

## 5. 代码结构

```
src/
├── config.ts                   # 四个用例配置（projectId/allowlist/触发原因）
├── wc.ts                       # SignClient 封装：init/connect/监听三事件/提取 verifyContext/toVerifyResult
├── App.tsx                     # 主界面
├── components/
│   ├── ProjectIdPicker.tsx     # 四用例 tab
│   ├── VerifyContextPanel.tsx  # 完整 dump verifyContext + 推导 verifyResult
│   └── EventLog.tsx            # 三事件历史
└── styles.css
```

技术取舍：用底层 `@walletconnect/sign-client` 而非 `@reown/app-kit` 高层，
因为 AppKit 不暴露底层 SignClient，拿不到 `verifyContext`；底层 sign-client 的
`signClient.on('session_proposal', e => e.verifyContext)` 是权威且最透明的路径。

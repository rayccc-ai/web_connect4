# web_connect4 · Case 4 · scam

| 项 | 值 |
|---|---|
| 预期 verifyResult | **scam** |
| WalletConnect projectId | （在 Vercel 环境变量 `VITE_PID_SCAM` 配真实值） |
| Dashboard allowlist 应配 | 任意 |
| 触发条件 | origin 被情报源标记 → isScam=true |

## Vercel 环境变量（仅这一个）

```
VITE_PID_SCAM = <你的 scam 用例 projectId>
```

> scam 需 origin 被情报源标记。若 Vercel 域名未被标记，访问时加 `?mockScam=1` 看 UI 演示。
> 真验收请用被标记过的域名。

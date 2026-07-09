# web_connect4 · WalletConnect Verify 测试桩 (Case 4 · scam)

这是 **scam** 用例的部署站点，用于复现 WalletConnect Verify 的 `verifyResult = "scam"`。

> 部署后 origin：`https://rayccc-ai.github.io/web_connect4`

## 这个站点对应哪个 tag

| 项 | 值 |
|---|---|
| 预期 verifyResult | **scam** |
| 占位 projectId（需替换） | `PUT_SCAM_PROJECT_ID` |
| Dashboard allowlist 应配 | 任意 |
| 触发条件 | origin 被合作的安全情报源标记为恶意 → `isScam=true`（独立于 validation，优先级最高） |

> 现实难点：scam 需要 origin 被情报源标记。若 `github.io/web_connect4` 未被标记，
> 可在站点 URL 后加 `?mockScam=1`，本桩会本地覆盖 `isScam=true` 仅供 UI 演示
> （事件历史里标 `*` 表示 mock，不影响真实 verify 链路）。
> 真实验收请用一个已被情报源标记的域名部署。

## 开启 GitHub Pages（让站点上线）

1. 打开 https://github.com/rayccc-ai/web_connect4/settings/pages
2. **Source** 选 `Deploy from a branch`
3. **Branch** 选 `main` / `(root)` / `Save`
4. 等约 1 分钟，访问 https://rayccc-ai.github.io/web_connect4

## 替换为真实 projectId

```bash
cd <源项目 wallet-connect>
VITE_PID_SCAM=<你的真实projectId> VITE_GH_USER=rayccc-ai npm run build
cp -R dist/. <本仓库路径>/
git add -A && git commit -m "inject real projectId for scam case" && git push
```

## 四种 tag 的完整说明

见源仓库 README。映射：`isScam==true → scam`，否则 `validation → valid/invalid/unknown`。

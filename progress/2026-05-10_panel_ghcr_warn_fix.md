# yiiicloude-panel GHCR WARN 补丁

**任务编号**：TASK-SN-GHCR-CLOSEOUT-01（任务 B）
**日期**：2026-05-10
**执行者**：Claude Sonnet 4.6 subagent

## 背景

Hermes 审计 AUDIT-39 发现 panel deploy.yml 相比 reports 模板有 4 处 WARN（W1-W4），此次全部补齐。

## 改动列表

### `.github/workflows/deploy.yml`

- **W1**：全量重启路径 `up -d --remove-orphans` 加 `--no-build`（防误 build）
- **W2**：deploy job 末尾加 `Cleanup SSH key`（`if: always()` + `rm -f ~/.ssh/deploy_key`）
- **W3**：deploy job 加 GHCR token scp + prod docker login GHCR 段（不再依赖 visibility=public 单点）
  - 新增 env：`GHCR_TOKEN: ${{ secrets.GITHUB_TOKEN }}` + `GHCR_USER: ${{ github.actor }}`
  - ssh 参数从 `"RESTART_FULL=$RESTART_FULL bash -s"` 改为 `"RESTART_FULL=$RESTART_FULL GHCR_USER=$GHCR_USER bash -s"`
  - 在 git pull 后、pull 镜像前加：`cat /tmp/ghcr_token.txt | docker login ghcr.io -u "$GHCR_USER" --password-stdin`
- **W4**：build-and-push job `Build and push` step 加 `build-args: GIT_SHA=${{ github.sha }}`

### `Dockerfile`

补 `ARG GIT_SHA=unknown` + `LABEL org.opencontainers.image.revision=$GIT_SHA`（加在 runner stage 顶部）。原 Dockerfile 无此段。

**注意**：panel 用根目录 `Dockerfile`（非 `docker/Dockerfile.cloud`），LABEL 加在 FROM runner 之后。

## 决策树验收

| 项 | 状态 | 说明 |
|---|---|---|
| A9 panel deploy.yml 已补 W1/W2/W3/W4 | PASS | 四项全部落地，YAML 语法验证通过 |
| A10 panel Dockerfile 含 ARG GIT_SHA + LABEL | PASS（原无，已补） | runner stage 顶部 |

## 备注

- panel 的单容器重启路径原本已有 `--no-build`（`up -d --no-build --remove-orphans panel-app`），此次仅补全量路径
- docker login 路线与 reports 模板完全对齐，prod 首次 push 后需在 GitHub web 或保持 private + 手动 docker login

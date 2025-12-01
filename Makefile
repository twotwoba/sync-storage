# Sync Storage - Chrome Extension Makefile
# ==========================================

.PHONY: help dev build release release-patch release-minor release-major clean

# 默认目标：显示帮助
help:
	@echo ""
	@echo "📦 Sync Storage 发布命令"
	@echo "========================"
	@echo ""
	@echo "  make dev            - 启动开发模式"
	@echo "  make build          - 构建生产版本"
	@echo ""
	@echo "  make release-patch  - 发布补丁版本 (0.0.x)"
	@echo "  make release-minor  - 发布次要版本 (0.x.0)"
	@echo "  make release-major  - 发布主要版本 (x.0.0)"
	@echo ""
	@echo "  make release v=1.2.3 - 发布指定版本"
	@echo ""
	@echo "  make clean          - 清理构建产物"
	@echo ""

# 开发模式
dev:
	pnpm dev

# 构建
build:
	pnpm build

# 发布补丁版本 (0.0.1 -> 0.0.2)
release-patch:
	@echo "🚀 发布补丁版本..."
	npm version patch -m "chore(release): v%s"
	git push origin main --tags
	@echo "✅ 发布完成！GitHub Actions 将自动发布到 Chrome Web Store"

# 发布次要版本 (0.1.0 -> 0.2.0)
release-minor:
	@echo "🚀 发布次要版本..."
	npm version minor -m "chore(release): v%s"
	git push origin main --tags
	@echo "✅ 发布完成！GitHub Actions 将自动发布到 Chrome Web Store"

# 发布主要版本 (1.0.0 -> 2.0.0)
release-major:
	@echo "🚀 发布主要版本..."
	npm version major -m "chore(release): v%s"
	git push origin main --tags
	@echo "✅ 发布完成！GitHub Actions 将自动发布到 Chrome Web Store"

# 发布指定版本 (make release v=1.2.3)
release:
ifndef v
	@echo "❌ 请指定版本号: make release v=1.2.3"
	@exit 1
endif
	@echo "🚀 发布版本 v$(v)..."
	npm version $(v) -m "chore(release): v%s"
	git push origin main --tags
	@echo "✅ 发布完成！GitHub Actions 将自动发布到 Chrome Web Store"

# 清理
clean:
	rm -rf dist
	rm -rf node_modules/.vite
	@echo "🧹 清理完成"

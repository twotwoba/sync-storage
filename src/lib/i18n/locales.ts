/**
 * 多语言配置
 */

export const locales = {
	"zh-CN": {
		// 标题
		title: "Sync Storage",
		subtitle: "Synchronize storage data across sites",

		// 空状态
		emptyTitle: "暂无同步规则",
		emptyDesc: "点击下方按钮创建你的第一个同步规则，实现跨站点的 localStorage 数据同步",
		createRule: "创建规则",
		addNewRule: "添加新规则",
		syncCount: "{count} 个同步项",

		// 表单标签
		sourceLabel: "SOURCE",
		sourcePlaceholder: "https://your.dev.com",
		targetLabel: "TARGET",
		targetPlaceholder: "http://localhost:6666",
		keysLabel: "同步键名 (Keys)",
		keysPlaceholder: "输入要同步的 key",
		addKey: "添加 key",

		// 按钮提示
		syncNow: "同步",
		syncing: "同步中...",
		isMonitoring: "监听中",
		notMonitoring: "未监听",
		startObserve: "开启监听",
		stopObserve: "停止监听",
		copyRule: "复制此规则",
		deleteRule: "删除此规则",

		// Toast 消息
		tip: "提示",
		warning: "注意",
		success: "成功",
		autoSync: "自动同步",
		emptyFieldsError: "源地址、目标地址和同步键名不能为空！",
		invalidSourceUrl: "源地址格式不正确，请输入有效的 URL（如 https://example.com）",
		invalidTargetUrl: "目标地址格式不正确，请输入有效的 URL（如 https://example.com）",
		syncSuccess: "同步完成！",
		syncFieldsNotFound: "同步失败，请检查「同步字段是否正确」且「源站是否已登录」！",
		observeStopped: "已停止监听",
		observeStarted: "监听已开启，源站storage数据将自动同步到目标站",
		autoSyncSuccess: "检测到登录状态，已自动同步数据！",
		duplicateTaskError: "已有相同的任务执行中"
	},
	en: {
		// Title
		title: "Sync Storage",
		subtitle: "Synchronize storage data across sites",

		// Empty state
		emptyTitle: "No sync rules yet",
		emptyDesc:
			"Click the button below to create your first sync rule for cross-site localStorage synchronization",
		createRule: "Create Rule",
		addNewRule: "Add New Rule",
		syncCount: "{count} sync items",

		// Form labels
		sourceLabel: "SOURCE",
		sourcePlaceholder: "https://your.dev.com",
		targetLabel: "TARGET",
		targetPlaceholder: "http://localhost:6666",
		keysLabel: "Sync Keys",
		keysPlaceholder: "Enter key to sync",
		addKey: "Add key",

		// Button tooltips
		syncNow: "Sync",
		syncing: "Syncing...",
		isMonitoring: "Monitoring",
		notMonitoring: "Idle",
		startObserve: "Start Watching",
		stopObserve: "Stop Watching",
		copyRule: "Copy Rule",
		deleteRule: "Delete Rule",

		// Toast messages
		tip: "Tip",
		warning: "Warning",
		success: "Success",
		autoSync: "Auto Sync",
		emptyFieldsError: "Source URL, target URL and sync keys cannot be empty!",
		invalidSourceUrl: "Invalid source URL. Please enter a valid URL (e.g. https://example.com)",
		invalidTargetUrl: "Invalid target URL. Please enter a valid URL (e.g. https://example.com)",
		syncSuccess: "Sync completed!",
		syncFieldsNotFound:
			"Sync failed. Please check if sync keys are correct and source site is logged in!",
		observeStopped: "Watching stopped",
		observeStarted: "Watching started. Data will auto-sync to target site from source site",
		autoSyncSuccess: "Login detected. Data has been auto-synced!",
		duplicateTaskError: "A task with the same configuration is already running"
	}
} as const

export type Locale = keyof typeof locales
export type TranslationKey = keyof (typeof locales)["zh-CN"]

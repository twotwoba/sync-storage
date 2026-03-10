import { DatabaseIcon, PlusIcon, SunIcon, MoonIcon } from "@/components/icons"
import { useI18n } from "@/lib/i18n"
import { useLocalStorage } from "@uidotdev/usehooks"

interface BlockTitleProps {
	itemCount: number
	onAdd: () => void
}

const BlockTitle = ({ itemCount, onAdd }: BlockTitleProps) => {
	const { t } = useI18n()
	const [darkMode, setDarkMode] = useLocalStorage<boolean>("sync-storage-dark-mode", false)

	const toggleTheme = () => {
		const newTheme = !darkMode
		setDarkMode(newTheme)
		document.documentElement.classList.toggle("dark", newTheme)
	}

	return (
		<header className="flex items-center justify-between px-5 py-4 border-b border-border bg-card sticky top-0 z-50 backdrop-blur-md">
			<div className="flex items-center gap-3">
				<div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
					<DatabaseIcon className="w-5 h-5 text-emerald-500" />
				</div>
				<div>
					<h1 className="text-[15px] font-bold text-foreground tracking-tight leading-tight">
						{t("title")}
					</h1>
					<p className="text-[11px] text-muted-foreground font-medium">
						{t("syncCount").replace("{count}", itemCount.toString())}
					</p>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onAdd}
					className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent border border-border transition-all duration-200 cursor-pointer active:scale-95"
					aria-label={t("addNewRule")}
				>
					<PlusIcon className="w-4 h-4" />
				</button>
				<button
					type="button"
					onClick={toggleTheme}
					className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent border border-border transition-all duration-200 cursor-pointer active:scale-95"
					aria-label={darkMode ? t("switchToLight") : t("switchToDark")}
				>
					{darkMode ? (
						<SunIcon className="w-4 h-4" />
					) : (
						<MoonIcon className="w-4 h-4" />
					)}
				</button>
			</div>
		</header>
	)
}

export default BlockTitle

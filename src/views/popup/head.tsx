import { DatabaseIcon, PlusIcon } from "@/components/icons"
import { useI18n } from "@/lib/i18n"

interface BlockTitleProps {
	itemCount: number
	onAdd: () => void
}

const BlockTitle = ({ itemCount, onAdd }: BlockTitleProps) => {
	const { t } = useI18n()

	return (
		<header className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02] sticky top-0 z-50 backdrop-blur-md">
			<div className="flex items-center gap-3">
				<div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
					<DatabaseIcon className="w-5 h-5 text-emerald-500" />
				</div>
				<div>
					<h1 className="text-[15px] font-bold text-white tracking-tight leading-tight">
						{t("title")}
					</h1>
					<p className="text-[11px] text-white/40 font-medium">
						{t("syncCount").replace("{count}", itemCount.toString())}
					</p>
				</div>
			</div>
			<button
				type="button"
				onClick={onAdd}
				className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 border border-white/10 transition-all duration-200 cursor-pointer active:scale-95"
				aria-label={t("addNewRule")}
			>
				<PlusIcon className="w-4 h-4" />
			</button>
		</header>
	)
}

export default BlockTitle

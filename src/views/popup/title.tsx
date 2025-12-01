import { MainIcon } from "@/components/icons"
import { useI18n } from "@/lib/i18n"

const BlockTitle = () => {
	const { t } = useI18n()

	return (
		<div className="flex items-center sticky top-0 z-50 rounded-2xl px-5 py-3.5 bg-gradient-to-r from-[rgba(255,255,255,0.12)] to-[rgba(255,255,255,0.06)] backdrop-blur-xl border border-white/10 shadow-lg shadow-black/5">
			<div className="flex items-center gap-3">
				<div className="p-1.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
					<MainIcon />
				</div>
				<div>
					<h1 className="font-semibold text-lg text-white tracking-tight">{t("title")}</h1>
					<p className="text-[11px] text-white/50">{t("subtitle")}</p>
				</div>
			</div>
		</div>
	)
}

export default BlockTitle

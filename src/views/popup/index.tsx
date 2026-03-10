import { useLocalStorage } from "@uidotdev/usehooks"
import { AnimatePresence, motion } from "framer-motion"
import { AddIcon, EmptyIcon } from "@/components/icons"
import { useI18n } from "@/lib/i18n"
import Section from "./section"
import Head from "./head"

const EmptyState = ({ onAdd }: { onAdd: () => void }) => {
	const { t } = useI18n()

	return (
		<motion.div
			className="flex flex-col items-center justify-center py-20 px-8"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
		>
			<div className="w-16 h-16 rounded-2xl bg-secondary border border-border flex items-center justify-center mb-6 shadow-xl">
				<EmptyIcon className="text-muted-foreground w-8 h-8" />
			</div>
			<h3 className="text-foreground text-lg font-bold mb-2 tracking-tight">
				{t("emptyTitle")}
			</h3>
			<p className="text-muted-foreground text-[13px] text-center mb-8 max-w-[320px] leading-relaxed">
				{t("emptyDesc")}
			</p>
			<button
				type="button"
				onClick={onAdd}
				className="flex items-center gap-2.5 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl cursor-pointer transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98]"
			>
				<AddIcon className="w-3 h-3 text-white" />
				<span>{t("createRule")}</span>
			</button>
		</motion.div>
	)
}

const Popup = () => {
	const [sectionItems, setSectionItems] = useLocalStorage<
		{ id: string; source: string; target: string; syncKeys: string[] }[]
	>("__sync_storage_items_", [])

	const handleAdd = () => {
		const id = crypto.randomUUID()
		setSectionItems((prev) => [...prev, { id, source: "", target: "", syncKeys: [] }])
		const timer = setTimeout(() => {
			document
				.getElementById("sync-storage-container")
				?.scrollTo({ top: 9999, behavior: "smooth" })
			clearTimeout(timer)
		}, 200)
	}

	const handleDel = (id: string) => {
		setSectionItems((prev) => prev.filter((item) => item.id !== id))
	}

	const handleCopy = (source: string, target: string, syncKeys: string[]) => {
		const id = crypto.randomUUID()
		setSectionItems((prev) => [...prev, { id, source, target, syncKeys }])
		const timer = setTimeout(() => {
			document
				.getElementById("sync-storage-container")
				?.scrollTo({ top: 9999, behavior: "smooth" })
			clearTimeout(timer)
		}, 200)
	}

	const hasItems = sectionItems.length > 0

	return (
		<div className="flex flex-col min-h-full">
			<Head itemCount={sectionItems.length} onAdd={handleAdd} />

			<div className="flex-1 px-4 py-2">
				{!hasItems ? (
					<EmptyState onAdd={handleAdd} />
				) : (
					<div className="pb-6">
						<AnimatePresence mode="popLayout" initial={false}>
							{sectionItems.map((item, _i) => (
								<Section
									key={item.id}
									index={_i}
									{...item}
									onChange={(id, field, value) => {
										setSectionItems((prev) =>
											prev.map((it) =>
												it.id === id
													? {
															...it,
															[field]: value
														}
													: it
											)
										)
									}}
									onDelete={handleDel}
									onCopy={handleCopy}
								/>
							))}
						</AnimatePresence>
					</div>
				)}
			</div>
		</div>
	)
}

export default Popup

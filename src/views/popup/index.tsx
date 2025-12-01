import { useLocalStorage } from "@uidotdev/usehooks"
import { AnimatePresence, motion } from "framer-motion"
import { AddIcon, EmptyIcon } from "@/components/icons"
import type { SectionItem } from "./section"
import Section from "./section"
import Title from "./title"

const EmptyState = ({ onAdd }: { onAdd: () => void }) => {
	return (
		<motion.div
			className="flex flex-col items-center justify-center py-16 px-8"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
		>
			<div className="p-4 rounded-full bg-white/5 mb-4">
				<EmptyIcon className="text-white/30" />
			</div>
			<h3 className="text-white/70 text-lg font-medium mb-2">暂无同步规则</h3>
			<p className="text-white/40 text-sm text-center mb-6 max-w-[280px]">
				点击下方按钮创建你的第一个同步规则，实现跨站点的 localStorage 数据同步
			</p>
			<button
				type="button"
				onClick={onAdd}
				className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-xl cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]"
			>
				<AddIcon className="text-white" />
				<span>创建规则</span>
			</button>
		</motion.div>
	)
}

const AddRuleCard = ({ onAdd }: { onAdd: () => void }) => {
	return (
		<motion.button
			type="button"
			onClick={onAdd}
			className="w-full mt-3 py-4 rounded-2xl border-2 border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-all duration-200 cursor-pointer group"
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.25, ease: "easeOut" }}
			whileHover={{ scale: 1.01 }}
			whileTap={{ scale: 0.99 }}
		>
			<div className="flex items-center justify-center gap-2 text-white/50 group-hover:text-white/70 transition-colors">
				<AddIcon className="w-4 h-4" />
				<span className="text-sm font-medium">添加新规则</span>
			</div>
		</motion.button>
	)
}

const Popup = () => {
	const [sectionItems, setSectionItems] = useLocalStorage<
		Omit<SectionItem, "onDelete" | "onChange" | "onCopy" | "index">[]
	>("__sync_storage_items_", [])

	const handleAdd = () => {
		const tempId = `temp-${Date.now()}-${Math.random()}`
		setSectionItems((prev) => [...prev, { id: tempId, source: "", target: "", syncKeys: [] }])
		const timer = setTimeout(() => {
			document.getElementById("sync-storage-container")?.scrollTo({ top: 9999, behavior: "smooth" })
			clearTimeout(timer)
		}, 200)
	}
	const handleDel = (id: string) => {
		setSectionItems((prev) => prev.filter((item) => item.id !== id))
	}

	const handleCopy = (source: string, target: string, syncKeys: string[]) => {
		const tempId = `temp-${Date.now()}-${Math.random()}`
		setSectionItems((prev) => [...prev, { id: tempId, source, target, syncKeys }])
		const timer = setTimeout(() => {
			document.getElementById("sync-storage-container")?.scrollTo({ top: 9999, behavior: "smooth" })
			clearTimeout(timer)
		}, 200)
	}

	const hasItems = sectionItems.length > 0

	return (
		<div className="px-4 pb-4 pt-3">
			<Title />
			{!hasItems ? (
				<EmptyState onAdd={handleAdd} />
			) : (
				<>
					<AnimatePresence mode="popLayout">
						{sectionItems.map((item, _i) => (
							<Section
								key={item.id}
								index={_i}
								{...item}
								onChange={(id, field, value) => {
									if (typeof field === "number") {
										// 这是在替换临时 id
										setSectionItems((prev) =>
											prev.map((it) => (it.id === id ? { ...it, id: value } : it))
										)
									} else {
										setSectionItems((prev) =>
											prev.map((it) =>
												it.id === id
													? {
															...it,
															[field]: field === "syncKeys" ? value.split("\n") : value
														}
													: it
											)
										)
									}
								}}
								onDelete={handleDel}
								onCopy={handleCopy}
							/>
						))}
					</AnimatePresence>
					<AddRuleCard onAdd={handleAdd} />
				</>
			)}
		</div>
	)
}

export default Popup

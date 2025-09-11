import { useLocalStorage } from "@uidotdev/usehooks"
import { AnimatePresence } from "framer-motion"
import { useEffect } from "react"
import type { SectionItem } from "./section"
import Section from "./section"
import Title from "./title"

const Popup = () => {
	const [sectionItems, setSectionItems] = useLocalStorage<
		Omit<SectionItem, "onDelete" | "onChange" | "index">[]
	>("__sync_storage_items_", [])

	useEffect(() => {
		if (sectionItems.length === 0) {
			const tempId = `temp-${Date.now()}-${Math.random()}`
			setSectionItems([{ id: tempId, source: "", target: "", syncKeys: [] }])
		}
	}, [])

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
	return (
		<div className="px-4 pb-4 pt-3">
			<Title onAdd={handleAdd} />
			<AnimatePresence>
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
					/>
				))}
			</AnimatePresence>
		</div>
	)
}

export default Popup

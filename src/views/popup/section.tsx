import { addToast, Tooltip } from "@heroui/react"
import { useLocalStorage } from "@uidotdev/usehooks"
import { AnimatePresence, motion } from "framer-motion"
import { type FC, useEffect, useId, useState } from "react"
import {
	ArrowRightIcon,
	CopyIcon,
	EyeIcon,
	EyeOffIcon,
	KeyIcon,
	PlusIcon,
	RefreshCwIcon,
	Trash2Icon
} from "@/components/icons"
import { useI18n } from "@/lib/i18n"

export type SectionItem = {
	id: string | undefined
	index: number

	source: string
	target: string
	syncKeys: string[]

	onChange: (
		id: string | undefined,
		field: "source" | "target" | "syncKeys" | number,
		value: any
	) => void
	onDelete: (id: string) => void
	onCopy: (source: string, target: string, syncKeys: string[]) => void
}

const Section: FC<SectionItem> = ({
	index,
	id,
	source,
	target,
	syncKeys,
	onChange,
	onDelete,
	onCopy
}) => {
	const uniqueId = useId()
	const { t } = useI18n()
	const [newKey, setNewKey] = useState("")
	const [isSyncing, setIsSyncing] = useState(false)

	// Set sync item unique id if it's a temporary one
	if (id?.startsWith("temp-")) {
		onChange(id, index, uniqueId)
	}

	// Sync control unique id
	const Observe_ID = `sync_storage_observe_${id}`
	const [isObserving, setIsObserving] = useLocalStorage(Observe_ID, false)

	const isValidUrl = (url: string) => {
		try {
			const parsed = new URL(url.trim())
			return parsed.protocol === "http:" || parsed.protocol === "https:"
		} catch {
			return false
		}
	}

	const validate = () => {
		if (!source.trim() || !target.trim() || !syncKeys.length) {
			addToast({
				title: t("tip"),
				description: t("emptyFieldsError"),
				timeout: 1500,
				color: "warning",
				radius: "lg",
				shouldShowTimeoutProgress: true
			})
			return false
		}

		if (!isValidUrl(source)) {
			addToast({
				title: t("tip"),
				description: t("invalidSourceUrl"),
				timeout: 2000,
				color: "warning",
				radius: "lg",
				shouldShowTimeoutProgress: true
			})
			return false
		}

		if (!isValidUrl(target)) {
			addToast({
				title: t("tip"),
				description: t("invalidTargetUrl"),
				timeout: 2000,
				color: "warning",
				radius: "lg",
				shouldShowTimeoutProgress: true
			})
			return false
		}

		return true
	}

	const handleSyncOnce = () => {
		if (validate()) {
			setIsSyncing(true)
			chrome.runtime.sendMessage(
				{
					type: "sync_once",
					payload: { source, target, keys: syncKeys }
				},
				(response: { error: boolean; msgKey: string }) => {
					setTimeout(() => {
						setIsSyncing(false)
					}, 800)
					if (response?.error) {
						addToast({
							title: t("warning"),
							description: t(response.msgKey),
							timeout: 2800,
							color: "warning",
							radius: "lg",
							shouldShowTimeoutProgress: true
						})
						return
					}
					addToast({
						title: t("success"),
						description: t(response.msgKey),
						timeout: 1200,
						color: "success",
						radius: "lg",
						shouldShowTimeoutProgress: true
					})
				}
			)
		}
	}

	const handleToggleObserve = () => {
		if (!validate()) {
			return
		}

		if (isObserving) {
			chrome.runtime.sendMessage(
				{ type: "sync_observe_stop", payload: { id } },
				(response) => {
					if (response && !response.error) {
						setIsObserving(false)
						addToast({
							title: t("tip"),
							description: t("observeStopped"),
							timeout: 1500,
							color: "default",
							radius: "lg"
						})
					}
				}
			)
		} else {
			chrome.runtime.sendMessage(
				{ type: "sync_observe_start", payload: { id, source, target, keys: syncKeys } },
				(response: { error: boolean; msgKey: string }) => {
					if (response?.error) {
						addToast({
							title: t("warning"),
							description: t(response.msgKey),
							timeout: 2500,
							color: "warning",
							radius: "lg"
						})
						return
					}
					setIsObserving(true)
					addToast({
						title: t("success"),
						description: t("observeStarted"),
						timeout: 2500,
						color: "success",
						radius: "lg"
					})
				}
			)
		}
	}

	const handleAddKey = () => {
		const key = newKey.trim()
		if (key && !syncKeys.includes(key)) {
			onChange(id, "syncKeys", [...syncKeys, key])
			setNewKey("")
		}
	}

	const handleRemoveKey = (keyToRemove: string) => {
		onChange(
			id,
			"syncKeys",
			syncKeys.filter((k) => k !== keyToRemove)
		)
	}

	useEffect(() => {
		const listener = (message: any) => {
			if (message.type === "observe_sync_complete" && message.payload?.ruleId === id) {
				if (!message.payload.error) {
					addToast({
						title: t("autoSync"),
						description: t("autoSyncSuccess"),
						timeout: 3000,
						color: "success",
						radius: "lg"
					})
				}
			}
		}
		chrome.runtime.onMessage.addListener(listener)
		return () => {
			chrome.runtime.onMessage.removeListener(listener)
		}
	}, [id, t])

	return (
		<motion.div
			className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-emerald-500/20 hover:bg-white/[0.05] mb-4 overflow-hidden"
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.95 }}
			layout
		>
			{/* Status indicator */}
			<div className="absolute top-4 right-4">
				<div
					className={`w-2 h-2 rounded-full ${
						isObserving
							? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"
							: "bg-white/10"
					}`}
				/>
			</div>

			{/* URL Row */}
			<div className="flex items-center gap-3 mb-5 pr-6">
				<div className="flex-1 min-w-0">
					<p className="text-[10px] uppercase tracking-wider text-white/30 mb-1.5 font-bold">
						{t("sourceLabel")}
					</p>
					<input
						type="text"
						value={source}
						disabled={isObserving}
						onChange={(e) => {
							onChange(id, "source", e.target.value)
						}}
						placeholder={t("sourcePlaceholder")}
						className="w-full bg-transparent border-none p-0 text-[13px] text-white/80 placeholder:text-white/20 focus:ring-0 font-mono truncate outline-none"
					/>
				</div>
				<div className="pt-4 flex-shrink-0">
					<ArrowRightIcon className="w-4 h-4 text-white/20" />
				</div>
				<div className="flex-1 min-w-0 text-right">
					<p className="text-[10px] uppercase tracking-wider text-white/30 mb-1.5 font-bold">
						{t("targetLabel")}
					</p>
					<input
						type="text"
						value={target}
						disabled={isObserving}
						onChange={(e) => {
							onChange(id, "target", e.target.value)
						}}
						placeholder={t("targetPlaceholder")}
						className="w-full bg-transparent border-none p-0 text-[13px] text-white/80 placeholder:text-white/20 focus:ring-0 font-mono text-right truncate outline-none"
					/>
				</div>
			</div>

			{/* Keys Chips Row */}
			<div className="flex items-start gap-2 mb-5">
				<KeyIcon className="w-3.5 h-3.5 text-white/20 shrink-0 mt-1.5" />
				<div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
					<AnimatePresence>
						{syncKeys.map((key) => (
							<motion.span
								key={key}
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.8 }}
								className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/5 px-2.5 py-1 text-[11px] font-mono text-white/60 group/chip hover:bg-white/10 hover:border-white/10 transition-colors"
							>
								{key}
								{!isObserving && (
									<button
										type="button"
										onClick={() => {
											handleRemoveKey(key)
										}}
										className="text-white/20 hover:text-red-400 transition-colors cursor-pointer"
									>
										×
									</button>
								)}
							</motion.span>
						))}
					</AnimatePresence>
					{!isObserving && (
						<div className="flex items-center gap-1.5 h-[26.5px] bg-white/[0.02] rounded-lg px-2 border border-dashed border-white/10 focus-within:border-emerald-500/30 transition-colors">
							<input
								type="text"
								value={newKey}
								onChange={(e) => {
									setNewKey(e.target.value)
								}}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										handleAddKey()
									}
								}}
								placeholder={t("addKey")}
								className="bg-transparent border-none p-0 text-[11px] text-white/50 placeholder:text-white/20 focus:ring-0 outline-none min-w-15"
							/>
							<button
								type="button"
								onClick={handleAddKey}
								className="text-white/30 hover:text-emerald-500 transition-colors cursor-pointer"
							>
								<PlusIcon className="w-3 h-3" />
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Actions Row */}
			<div className="flex items-center gap-2 pt-3 border-t border-white/5">
				<button
					type="button"
					onClick={handleSyncOnce}
					disabled={isObserving || isSyncing}
					className="flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 transition-all duration-200 cursor-pointer active:scale-95"
				>
					<RefreshCwIcon className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
					{isSyncing ? t("syncing") : t("syncNow")}
				</button>

				<button
					type="button"
					onClick={handleToggleObserve}
					className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
						isObserving
							? "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
							: "text-white/40 bg-white/5 hover:bg-white/10"
					}`}
				>
					{isObserving ? (
						<>
							<EyeIcon className="w-3.5 h-3.5" />
							{t("isMonitoring")}
						</>
					) : (
						<>
							<EyeOffIcon className="w-3.5 h-3.5" />
							{t("notMonitoring")}
						</>
					)}
				</button>

				<div className="flex-1" />

				<Tooltip content={t("copyRule")}>
					<button
						type="button"
						onClick={() => {
							onCopy(source, target, syncKeys)
						}}
						className="flex items-center justify-center w-8 h-8 rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all duration-200 cursor-pointer"
					>
						<CopyIcon className="w-3.5 h-3.5" />
					</button>
				</Tooltip>

				<Tooltip content={t("deleteRule")}>
					<button
						type="button"
						onClick={() => {
							onDelete(id as string)
							localStorage.removeItem(Observe_ID)
						}}
						className="flex items-center justify-center w-8 h-8 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
					>
						<Trash2Icon className="w-3.5 h-3.5" />
					</button>
				</Tooltip>
			</div>
		</motion.div>
	)
}

export default Section

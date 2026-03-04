import { addToast, Tooltip } from "@heroui/react"
import { useLocalStorage } from "@uidotdev/usehooks"
import { AnimatePresence, motion } from "framer-motion"
import { type FC, useEffect, useState, useCallback } from "react"
import {
	ArrowRightIcon,
	CopyIcon,
	KeyIcon,
	PlusIcon,
	RefreshCwIcon,
	Trash2Icon
} from "@/components/icons"
import { useI18n } from "@/lib/i18n"

export type SectionItem = {
	id: string
	index: number

	source: string
	target: string
	syncKeys: string[]

	onChange: (id: string, field: "source" | "target" | "syncKeys", value: any) => void
	onDelete: (id: string) => void
	onCopy: (source: string, target: string, syncKeys: string[]) => void
}

const Section: FC<SectionItem> = ({ id, source, target, syncKeys, onChange, onDelete, onCopy }) => {
	const { t } = useI18n()
	const [newKey, setNewKey] = useState("")
	const [isSyncing, setIsSyncing] = useState(false)
	const [showSuccessGlow, setShowSuccessGlow] = useState(false)

	// Observe state from background
	const [isObserving, setIsObserving] = useLocalStorage(`sync_storage_observe_${id}`, false)

	const isValidUrl = (url: string) => {
		try {
			const parsed = new URL(url.trim())
			return parsed.protocol === "http:" || parsed.protocol === "https:"
		} catch {
			return false
		}
	}

	const validate = useCallback(() => {
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

		if (!isValidUrl(source) || !isValidUrl(target)) {
			addToast({
				title: t("tip"),
				description: t(!isValidUrl(source) ? "invalidSourceUrl" : "invalidTargetUrl"),
				timeout: 2000,
				color: "warning",
				radius: "lg",
				shouldShowTimeoutProgress: true
			})
			return false
		}

		return true
	}, [source, target, syncKeys, t])

	const handleSync = () => {
		if (!validate()) {
			return
		}

		if (isObserving) {
			// Stop Syncing (Scenario B - Stop)
			chrome.runtime.sendMessage(
				{ type: "sync_observe_stop", payload: { id } },
				(response) => {
					if (response && !response.error) {
						setIsObserving(false)
						setIsSyncing(false)
					}
				}
			)
		} else {
			// Start Syncing
			setIsSyncing(true)
			chrome.runtime.sendMessage(
				{
					type: "sync_once",
					payload: { source, target, keys: syncKeys }
				},
				(response: { error: boolean; msgKey: string }) => {
					if (response?.error) {
						if (response.msgKey === "syncFieldsNotFound") {
							// Scenario B: Source not ready, start background monitoring
							setIsObserving(true)
							setIsSyncing(false)
							chrome.runtime.sendMessage({
								type: "sync_observe_start",
								payload: { id, source, target, keys: syncKeys }
							})
							addToast({
								title: t("tip"),
								description: t("observeStarted"),
								timeout: 2000,
								color: "warning",
								radius: "lg"
							})
						} else {
							setIsSyncing(false)
							addToast({
								title: t("tip"),
								description: t(response.msgKey),
								timeout: 3000,
								color: "danger",
								radius: "lg"
							})
						}
						return
					}

					// Scenario A: Instant Sync Success
					setShowSuccessGlow(true)
					addToast({
						title: t("success"),
						description: t(response.msgKey),
						timeout: 1200,
						color: "success",
						radius: "lg"
					})

					setTimeout(() => {
						setIsSyncing(false)
						setShowSuccessGlow(false)
					}, 1000)
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
		// Sync status with background on mount
		chrome.runtime.sendMessage(
			{ type: "sync_check_observe_status", payload: { id } },
			(response) => {
				if (response && typeof response.isObserving === "boolean") {
					setIsObserving(response.isObserving)
				}
			}
		)

		const listener = (message: any) => {
			if (message.type === "observe_sync_complete" && message.payload?.ruleId === id) {
				if (!message.payload.error) {
					setIsObserving(false)
					setIsSyncing(false)
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
		return () => chrome.runtime.onMessage.removeListener(listener)
	}, [id, t, setIsObserving])

	return (
		<motion.div
			className={`group relative rounded-2xl border p-4 transition-all duration-500 mb-4 overflow-hidden ${
				showSuccessGlow
					? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
					: "border-white/10 bg-white/[0.03] hover:border-emerald-500/20 hover:bg-white/[0.05]"
			}`}
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.95 }}
			layout
		>
			{/* Status indicator */}
			<div className="absolute top-4 right-4">
				<div
					className={`w-2 h-2 rounded-full transition-all duration-300 ${
						isObserving
							? "bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]"
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
						onChange={(e) => onChange(id, "source", e.target.value)}
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
						onChange={(e) => onChange(id, "target", e.target.value)}
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
										onClick={() => handleRemoveKey(key)}
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
								onChange={(e) => setNewKey(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleAddKey()}
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
					onClick={handleSync}
					className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12px] font-bold transition-all duration-300 cursor-pointer active:scale-95 shadow-lg ${
						isObserving
							? "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 shadow-amber-500/10"
							: "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 shadow-emerald-500/10"
					}`}
				>
					<RefreshCwIcon
						className={`w-3.5 h-3.5 ${isSyncing || isObserving ? "animate-spin" : ""}`}
					/>
					<span>
						{isObserving
							? t("stopSync") || "停止同步"
							: isSyncing
								? t("syncing")
								: t("syncNow")}
					</span>
				</button>

				<div className="flex-1" />

				<Tooltip content={t("copyRule")} isDisabled={isObserving}>
					<button
						type="button"
						onClick={() => onCopy(source, target, syncKeys)}
						className="flex items-center justify-center w-8 h-8 rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all duration-200 cursor-pointer"
					>
						<CopyIcon className="w-3.5 h-3.5" />
					</button>
				</Tooltip>

				<Tooltip content={t("deleteRule")} isDisabled={isObserving}>
					<button
						type="button"
						disabled={isObserving}
						onClick={() => {
							onDelete(id)
							localStorage.removeItem(`sync_storage_observe_${id}`)
							chrome.runtime.sendMessage({
								type: "sync_observe_stop",
								payload: { id }
							})
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

import { addToast, Tooltip } from "@heroui/react"
import { useLocalStorage } from "@uidotdev/usehooks"
import { AnimatePresence, motion } from "framer-motion"
import { type FC, useEffect, useRef, useState, useCallback } from "react"
import {
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
	targets: string[]
	syncKeys: string[]

	onChange: (id: string, field: "source" | "targets" | "syncKeys", value: any) => void
	onDelete: (id: string) => void
	onCopy: (source: string, targets: string[], syncKeys: string[]) => void
}

const Section: FC<SectionItem> = ({ id, source, targets, syncKeys, onChange, onDelete, onCopy }) => {
	const { t } = useI18n()
	const [newKey, setNewKey] = useState("")
	// Track syncing state per target index
	const [syncingTargetIndex, setSyncingTargetIndex] = useState<number | null>(null)
	const [showSuccessGlow, setShowSuccessGlow] = useState(false)

	// Observe states per target (keyed by ruleId which is `${id}_${targetIndex}`)
	const [observeMap, setObserveMap] = useLocalStorage<Record<string, boolean>>(
		`sync_storage_observe_${id}`,
		{}
	)

	const isValidUrl = (url: string) => {
		try {
			const parsed = new URL(url.trim())
			return parsed.protocol === "http:" || parsed.protocol === "https:"
		} catch {
			return false
		}
	}

	const getObserveKey = (targetIndex: number) => `${id}_${targetIndex}`

	const isObserving = Object.values(observeMap).some(Boolean)

	// Refs for accessing latest values in stable callbacks
	const targetsRef = useRef(targets)
	targetsRef.current = targets
	const observeMapRef = useRef(observeMap)
	observeMapRef.current = observeMap

	const validateForTarget = useCallback((targetIndex: number) => {
		const targetUrl = targets[targetIndex]
		if (!source.trim() || !targetUrl?.trim() || !syncKeys.length) {
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

		if (!isValidUrl(targetUrl)) {
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
	}, [source, targets, syncKeys, t])

	const handleSyncTarget = (targetIndex: number) => {
		if (!validateForTarget(targetIndex)) return

		const observeKey = getObserveKey(targetIndex)
		const target = targets[targetIndex]

		if (observeMap[observeKey]) {
			// Stop observing this target
			chrome.runtime.sendMessage(
				{ type: "sync_observe_stop", payload: { id: observeKey } },
				(response) => {
					if (response && !response.error) {
						setObserveMap((prev) => ({ ...prev, [observeKey]: false }))
						setSyncingTargetIndex(null)
					}
				}
			)
		} else {
			// Start sync for this target
			setSyncingTargetIndex(targetIndex)
			chrome.runtime.sendMessage(
				{
					type: "sync_once",
					payload: { source, target, keys: syncKeys }
				},
				(response: { error: boolean; msgKey: string } | undefined) => {
					if (!response) {
						setSyncingTargetIndex(null)
						addToast({
							title: t("tip"),
							description: t("syncFailed"),
							timeout: 3000,
							color: "danger",
							radius: "lg"
						})
						return
					}

					if (response.error) {
						if (response.msgKey === "syncFieldsNotFound") {
							// Source has no data yet — enter observe mode
							setObserveMap((prev) => ({ ...prev, [observeKey]: true }))
							setSyncingTargetIndex(null)
							chrome.runtime.sendMessage({
								type: "sync_observe_start",
								payload: { id: observeKey, source, target, keys: syncKeys }
							})
							addToast({
								title: t("tip"),
								description: t("observeStarted"),
								timeout: 2000,
								color: "warning",
								radius: "lg"
							})
						} else {
							setSyncingTargetIndex(null)
							addToast({
								title: t("tip"),
								description: t(response.msgKey) || t("syncFailed"),
								timeout: 3000,
								color: "danger",
								radius: "lg"
							})
						}
						return
					}

					// Success
					setShowSuccessGlow(true)
					addToast({
						title: t("success"),
						description: t(response.msgKey),
						timeout: 1200,
						color: "success",
						radius: "lg"
					})

					setTimeout(() => {
						setSyncingTargetIndex(null)
						setShowSuccessGlow(false)
					}, 1000)
				}
			)
		}
	}

	const handleAddTarget = () => {
		onChange(id, "targets", [...targets, ""])
	}

	const handleRemoveTarget = (targetIndex: number) => {
		// Stop observe for the removed target
		const removedKey = getObserveKey(targetIndex)
		if (observeMap[removedKey]) {
			chrome.runtime.sendMessage({
				type: "sync_observe_stop",
				payload: { id: removedKey }
			})
		}

		// Stop observes for targets after the removed one (their indices will shift)
		for (let i = targetIndex + 1; i < targets.length; i++) {
			const oldKey = getObserveKey(i)
			if (observeMap[oldKey]) {
				chrome.runtime.sendMessage({
					type: "sync_observe_stop",
					payload: { id: oldKey }
				})
			}
		}

		// Remove from targets array
		const newTargets = targets.filter((_, i) => i !== targetIndex)
		onChange(id, "targets", newTargets)

		// Rebuild observeMap with corrected indices
		const newObserveMap: Record<string, boolean> = {}
		for (let i = 0; i < newTargets.length; i++) {
			if (i < targetIndex) {
				const oldKey = getObserveKey(i)
				if (observeMap[oldKey]) newObserveMap[getObserveKey(i)] = true
			} else {
				// After removed target: old index was i+1, now i
				const oldKey = getObserveKey(i + 1)
				if (observeMap[oldKey]) {
					newObserveMap[getObserveKey(i)] = true
					// Restart observe with new key
					chrome.runtime.sendMessage({
						type: "sync_observe_start",
						payload: {
							id: getObserveKey(i),
							source,
							target: newTargets[i],
							keys: syncKeys
						}
					})
				}
			}
		}
		setObserveMap(newObserveMap)
	}

	const handleTargetChange = (targetIndex: number, value: string) => {
		const newTargets = [...targets]
		newTargets[targetIndex] = value
		onChange(id, "targets", newTargets)
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

	// Check observe status on mount only
	useEffect(() => {
		targetsRef.current.forEach((_, targetIndex) => {
			const observeKey = getObserveKey(targetIndex)
			chrome.runtime.sendMessage(
				{ type: "sync_check_observe_status", payload: { id: observeKey } },
				(response) => {
					if (response && typeof response.isObserving === "boolean") {
						setObserveMap((prev) => ({ ...prev, [observeKey]: response.isObserving }))
					}
				}
			)
		})
	}, [id])

	// Message listener — stable, uses refs for current values
	useEffect(() => {
		const listener = (message: any) => {
			if (message.type === "observe_sync_complete" && message.payload?.ruleId) {
				const ruleId = message.payload.ruleId
				const currentTargets = targetsRef.current
				const matchingIndex = currentTargets.findIndex((_, i) => getObserveKey(i) === ruleId)
				if (matchingIndex !== -1) {
					if (!message.payload.error) {
						setObserveMap((prev) => ({ ...prev, [ruleId]: false }))
						setSyncingTargetIndex(null)
						addToast({
							title: t("autoSync"),
							description: t("autoSyncSuccess"),
							timeout: 3000,
							color: "success",
							radius: "lg"
						})
					} else {
						setObserveMap((prev) => ({ ...prev, [ruleId]: false }))
						setSyncingTargetIndex(null)
						addToast({
							title: t("tip"),
							description: t("syncFailed"),
							timeout: 3000,
							color: "danger",
							radius: "lg"
						})
					}
				}
			}
		}
		chrome.runtime.onMessage.addListener(listener)
		return () => chrome.runtime.onMessage.removeListener(listener)
	}, [id])

	// Cleanup all observes on unmount — uses ref to avoid stale closure
	useEffect(() => {
		return () => {
			const currentMap = observeMapRef.current
			Object.entries(currentMap).forEach(([key, observing]) => {
				if (observing) {
					chrome.runtime.sendMessage({
						type: "sync_observe_stop",
						payload: { id: key }
					})
				}
			})
		}
	}, [])

	return (
		<motion.div
			className={`group relative rounded-2xl border p-4 transition-all duration-500 mb-4 overflow-hidden ${
				showSuccessGlow
					? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
					: "border-border bg-card hover:border-emerald-500/30"
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
							: "bg-muted"
					}`}
				/>
			</div>

			{/* Source */}
			<div className="mb-4 pr-6">
				<p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold">
					{t("sourceLabel")}
				</p>
				<input
					type="text"
					value={source}
					disabled={isObserving}
					onChange={(e) => onChange(id, "source", e.target.value)}
					placeholder={t("sourcePlaceholder")}
					className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:ring-0 font-mono truncate outline-none focus:border-emerald-500/40 transition-colors"
				/>
			</div>

			{/* Targets */}
			<div className="mb-4">
				<div className="flex items-center justify-between mb-2">
					<p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
						{t("targetsLabel")}
					</p>
					{!isObserving && (
						<button
							type="button"
							onClick={handleAddTarget}
							className="flex items-center gap-1 text-[11px] text-emerald-500 hover:text-emerald-400 transition-colors cursor-pointer"
						>
							<PlusIcon className="w-3 h-3" />
							<span>{t("addTarget")}</span>
						</button>
					)}
				</div>
				<div className="space-y-2">
					<AnimatePresence initial={false}>
						{targets.map((targetUrl, targetIndex) => {
							const observeKey = getObserveKey(targetIndex)
							const isTargetSyncing = syncingTargetIndex === targetIndex
							const isTargetObserving = observeMap[observeKey] || false

							return (
								<motion.div
									key={targetIndex}
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: "auto" }}
									exit={{ opacity: 0, height: 0 }}
									className="flex items-center gap-2"
								>
									<span className="text-[11px] text-muted-foreground shrink-0 w-4 text-right">
										{targetIndex + 1}.
									</span>
									<input
										type="text"
										value={targetUrl}
										disabled={isTargetObserving}
										onChange={(e) => handleTargetChange(targetIndex, e.target.value)}
										placeholder={t("targetPlaceholder")}
										className="flex-1 min-w-0 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:ring-0 font-mono truncate outline-none focus:border-emerald-500/40 transition-colors disabled:opacity-60"
									/>
									<button
										type="button"
										onClick={() => handleSyncTarget(targetIndex)}
										className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold transition-all duration-300 cursor-pointer active:scale-95 whitespace-nowrap ${
											isTargetObserving
												? "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
												: "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
										}`}
									>
										<RefreshCwIcon
											className={`w-3 h-3 ${isTargetSyncing || isTargetObserving ? "animate-spin" : ""}`}
										/>
										<span>
											{isTargetObserving
												? t("stopSync")
												: isTargetSyncing
													? t("syncing")
													: t("syncNow")}
										</span>
									</button>
									{!isTargetObserving && targets.length > 1 && (
										<button
											type="button"
											onClick={() => handleRemoveTarget(targetIndex)}
											className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
										>
											×
										</button>
									)}
								</motion.div>
							)
						})}
					</AnimatePresence>
				</div>
			</div>

			{/* Keys Chips Row */}
			<div className="flex items-start gap-2 mb-4">
				<KeyIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1.5" />
				<div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
					<AnimatePresence>
						{syncKeys.map((key) => (
							<motion.span
								key={key}
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.8 }}
								className="inline-flex items-center gap-1.5 rounded-lg bg-secondary/60 border border-border/80 px-2.5 py-1 text-[11px] font-mono text-foreground group/chip hover:bg-accent hover:border-emerald-500/30 transition-colors"
							>
								{key}
								{!isObserving && (
									<button
										type="button"
										onClick={() => handleRemoveKey(key)}
										className="text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
									>
										×
									</button>
								)}
							</motion.span>
						))}
					</AnimatePresence>
					{!isObserving && (
						<div className="flex items-center gap-1.5 h-[26.5px] bg-secondary/50 rounded-lg px-2 border border-dashed border-border focus-within:border-emerald-500/40 transition-colors">
							<input
								type="text"
								value={newKey}
								onChange={(e) => setNewKey(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleAddKey()}
								placeholder={t("addKey")}
								className="bg-transparent border-none p-0 text-[11px] text-foreground placeholder:text-muted-foreground focus:ring-0 outline-none min-w-15"
							/>
							<button
								type="button"
								onClick={handleAddKey}
								className="text-muted-foreground hover:text-emerald-500 transition-colors cursor-pointer"
							>
								<PlusIcon className="w-3 h-3" />
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Actions Row */}
			<div className="flex items-center gap-2 pt-3 border-t border-border">
				<div className="flex-1" />

				<Tooltip content={t("copyRule")} isDisabled={isObserving}>
					<button
						type="button"
						onClick={() => onCopy(source, targets, syncKeys)}
						className="flex items-center justify-center w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 cursor-pointer"
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
							// Stop all observes for all targets
							targets.forEach((_, targetIndex) => {
								const observeKey = getObserveKey(targetIndex)
								if (observeMap[observeKey]) {
									chrome.runtime.sendMessage({
										type: "sync_observe_stop",
										payload: { id: observeKey }
									})
								}
							})
						}}
						className="flex items-center justify-center w-8 h-8 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
					>
						<Trash2Icon className="w-3.5 h-3.5" />
					</button>
				</Tooltip>
			</div>
		</motion.div>
	)
}

export default Section

import { Button } from "@heroui/button"
import { Input, Textarea } from "@heroui/input"
import { addToast, Tooltip } from "@heroui/react"
import { useLocalStorage } from "@uidotdev/usehooks"
import { motion } from "framer-motion"
import { type FC, useEffect, useId } from "react"
import {
	ArrowRightIcon,
	CopyIcon,
	DeleteIcon,
	EyeIcon,
	EyeOffIcon,
	SyncIcon
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
		value: string
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

	// set sycn item unique id
	if (id?.startsWith("temp-")) {
		onChange(id, index, uniqueId)
	}

	// sync control unique id
	const Sync_ID = `sync_storage_section_${id}`
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
		if (
			!source.trim() ||
			!target.trim() ||
			!syncKeys.filter((item) => item.trim().length > 0).length
		) {
			addToast({
				title: t("tip"),
				description: t("emptyFieldsError"),
				timeout: 1500,
				color: "warning",
				radius: "lg",
				shouldShowTimeoutProgress: true,
				classNames: {
					motionDiv: "w-[500px]"
				}
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
				shouldShowTimeoutProgress: true,
				classNames: {
					motionDiv: "w-[500px]"
				}
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
				shouldShowTimeoutProgress: true,
				classNames: {
					motionDiv: "w-[500px]"
				}
			})
			return false
		}

		return true
	}
	const handleSyncOnce = () => {
		if (validate()) {
			chrome.runtime.sendMessage(
				{
					type: "sync_once",
					payload: { source, target, keys: syncKeys }
				},
				(response: { error: boolean; msgKey: string }) => {
					if (response?.error) {
						addToast({
							title: t("warning"),
							description: t(response.msgKey),
							timeout: 2800,
							color: "warning",
							radius: "lg",
							shouldShowTimeoutProgress: true,
							classNames: {
								motionDiv: "w-[500px]"
							}
						})
						return
					}
					addToast({
						title: t("success"),
						description: t(response.msgKey),
						timeout: 1200,
						color: "success",
						radius: "lg",
						shouldShowTimeoutProgress: true,
						classNames: {
							motionDiv: "w-[500px]"
						}
					})
				}
			)
		}
	}
	const handleToggleObserve = () => {
		if (!validate()) return

		if (isObserving) {
			// Stop observing
			chrome.runtime.sendMessage(
				{
					type: "sync_observe_stop",
					payload: { id }
				},
				(response) => {
					if (response && !response.error) {
						setIsObserving(false)
						addToast({
							title: t("tip"),
							description: t("observeStopped"),
							timeout: 1500,
							color: "default",
							radius: "lg",
							shouldShowTimeoutProgress: true,
							classNames: {
								motionDiv: "w-[500px]"
							}
						})
					}
				}
			)
		} else {
			// Start observing
			chrome.runtime.sendMessage(
				{
					type: "sync_observe_start",
					payload: { id, source, target, keys: syncKeys }
				},
				(response: { error: boolean; msgKey: string }) => {
					if (response?.error) {
						addToast({
							title: t("warning"),
							description: t(response.msgKey),
							timeout: 2500,
							color: "warning",
							radius: "lg",
							shouldShowTimeoutProgress: true,
							classNames: {
								motionDiv: "w-[500px]"
							}
						})
						return
					}
					setIsObserving(true)
					addToast({
						title: t("success"),
						description: t("observeStarted"),
						timeout: 2500,
						color: "success",
						radius: "lg",
						shouldShowTimeoutProgress: true,
						classNames: {
							motionDiv: "w-[500px]"
						}
					})
				}
			)
		}
	}

	// Listen for auto-sync completion messages
	useEffect(() => {
		const listener = (message: any) => {
			if (message.type === "observe_sync_complete" && message.payload?.ruleId === id) {
				if (!message.payload.error) {
					addToast({
						title: t("autoSync"),
						description: t("autoSyncSuccess"),
						timeout: 3000,
						color: "success",
						radius: "lg",
						shouldShowTimeoutProgress: true
					})
				}
			}
		}
		chrome.runtime.onMessage.addListener(listener)
		return () => chrome.runtime.onMessage.removeListener(listener)
	}, [id, t])

	return (
		<motion.div
			className="relative rounded-2xl mt-3 bg-gradient-to-br from-[rgba(255,255,255,0.1)] to-[rgba(255,255,255,0.05)] backdrop-blur-lg border border-white/10 overflow-hidden group hover:border-white/20 transition-all duration-300"
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -12 }}
			transition={{
				duration: 0.25,
				ease: "easeOut"
			}}
			layout="position"
		>
			{/* Top decoration bar */}
			<div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-60" />

			<div className="p-4">
				{/* Source and target input area */}
				<div className="flex items-center gap-2 mb-3">
					<div className="flex-1">
						<Input
							label={t("sourceLabel")}
							placeholder={t("sourcePlaceholder")}
							size="sm"
							isDisabled={isObserving}
							value={source}
							onChange={(e) => onChange(id, "source", e.target.value)}
							classNames={{
								inputWrapper:
									"!bg-white/5 border-white/10 !py-1 data-[hover=true]:!bg-white/10 data-[focus=true]:!bg-white/10 data-[focus=true]:!border-sky-500/50 transition-colors",
								input: "!text-white/80 placeholder:text-white/30",
								label: "!text-white font-medium"
							}}
						/>
					</div>
					<div className="flex-shrink-0">
						<ArrowRightIcon className="text-white/40" />
					</div>
					<div className="flex-1">
						<Input
							label={t("targetLabel")}
							placeholder={t("targetPlaceholder")}
							size="sm"
							isDisabled={isObserving}
							value={target}
							onChange={(e) => onChange(id, "target", e.target.value)}
							classNames={{
								inputWrapper:
									"!bg-white/5 border-white/10 !py-1 data-[hover=true]:!bg-white/10 data-[focus=true]:!bg-white/10 data-[focus=true]:!border-sky-500/50 transition-colors",
								input: "!text-white/80 placeholder:text-white/30",
								label: "!text-white font-medium"
							}}
						/>
					</div>
				</div>

				{/* Sync keys and action buttons */}
				<div className="flex gap-3">
					<Textarea
						className="flex-1"
						label={t("keysLabel")}
						isDisabled={isObserving}
						value={syncKeys.join("\n")}
						placeholder={t("keysPlaceholder")}
						minRows={3}
						maxRows={5}
						onChange={(e) => onChange(id, "syncKeys", e.target.value)}
						classNames={{
							inputWrapper:
								"!bg-white/5 border-white/10 data-[hover=true]:!bg-white/10 data-[focus=true]:!bg-white/10 data-[focus=true]:!border-sky-500/50 transition-colors",
							input: "!text-white/80 placeholder:text-white/30 text-sm",
							label: "!text-white font-medium"
						}}
					/>
					<div className="flex flex-col gap-2 justify-end">
						<div className="flex gap-2">
							<Tooltip content={t("syncNow")} placement="left">
								<Button
									className="h-[42px] min-w-[42px] bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
									isDisabled={isObserving}
									onPress={handleSyncOnce}
								>
									<SyncIcon className="w-5 h-5" />
								</Button>
							</Tooltip>
							<Tooltip
								content={isObserving ? t("stopObserve") : t("startObserve")}
								placement="left"
							>
								<Button
									className={`h-[42px] min-w-[42px] text-white font-medium rounded-xl shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
										isObserving
											? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/25 hover:shadow-amber-500/40"
											: "bg-gradient-to-r from-violet-500 to-purple-500 shadow-violet-500/25 hover:shadow-violet-500/40"
									}`}
									onPress={handleToggleObserve}
								>
									{isObserving ? (
										<EyeOffIcon className="w-5 h-5" />
									) : (
										<EyeIcon className="w-5 h-5" />
									)}
								</Button>
							</Tooltip>
						</div>
						<div className="flex gap-2">
							<Tooltip content={t("copyRule")} placement="bottom">
								<Button
									className="h-[42px] min-w-[42px] bg-white/5 hover:bg-blue-500/20 text-white/60 hover:text-blue-400 rounded-xl border border-white/10 hover:border-blue-500/30 transition-all duration-200"
									isDisabled={isObserving}
									onPress={() => onCopy(source, target, syncKeys)}
								>
									<CopyIcon className="w-4 h-4" />
								</Button>
							</Tooltip>
							<Tooltip content={t("deleteRule")} placement="bottom">
								<Button
									className="h-[42px] min-w-[42px] bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 rounded-xl border border-white/10 hover:border-red-500/30 transition-all duration-200"
									isDisabled={isObserving}
									onPress={() => {
										onDelete(id as string)
										localStorage.removeItem(Sync_ID)
										localStorage.removeItem(Observe_ID)
									}}
								>
									<DeleteIcon className="w-4 h-4" />
								</Button>
							</Tooltip>
						</div>
					</div>
				</div>
			</div>
		</motion.div>
	)
}

export default Section

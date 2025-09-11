import { Button } from "@heroui/button"
import { Input, Textarea } from "@heroui/input"
import { addToast } from "@heroui/react"
import { useLocalStorage } from "@uidotdev/usehooks"
import { motion } from "framer-motion"
import { type FC, useId } from "react"
import { DeleteIcon } from "@/components/icons"

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
}

const Section: FC<SectionItem> = ({ index, id, source, target, syncKeys, onChange, onDelete }) => {
	const uniqueId = useId()

	// set sycn item unique id
	if (id?.startsWith("temp-")) {
		onChange(id, index, uniqueId)
	}

	// sync control unique id
	const Sync_ID = `sync_storage_section_${id}`
	const [isSyncing, setIsSyncing] = useLocalStorage(Sync_ID, false)
	const validate = () => {
		if (
			!source.trim() ||
			!target.trim() ||
			!syncKeys.filter((item) => item.trim().length > 0).length
		) {
			addToast({
				title: "Warning",
				description: "Source, Target and Sync Keys cannot be empty!",
				timeout: 1200,
				color: "warning",
				radius: "lg",
				shouldShowTimeoutProgress: true,
				classNames: {
					motionDiv: "w-[430px]"
				}
			})
			return false
		}
		return true
	}
	const handleSyncOnce = () => {
		if (validate()) {
			chrome.runtime.sendMessage({ type: "sync_once", payload: { source, target, keys: syncKeys } })
		}
	}
	const handleSwitchSync = () => {
		if (validate()) {
			if (isSyncing) {
				localStorage.removeItem(Sync_ID)
				chrome.runtime.sendMessage({ type: "cleanup_listener" })
			} else {
				chrome.runtime.sendMessage({
					type: "sync_observe",
					payload: { source, target, keys: syncKeys }
				})
			}
			setIsSyncing(!isSyncing)
		}
	}

	chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
		if (message.type === "cleanup_success") {
			localStorage.removeItem(Sync_ID)
			setIsSyncing(false)
		}
		return true
	})

	return (
		<motion.div
			className="relative border border-blue-100 rounded-2xl py-4 px-6 mt-4 bg-[rgba(255,255,255,0.2)]"
			initial={{ opacity: 0, x: -100 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: 100 }}
			transition={{
				type: "spring",
				stiffness: 300,
				damping: 30,
				duration: 0.2
			}}
			layout
		>
			{/* <DeleteIcon
				className="absolute top-2 right-2 cursor-pointer"
				onClick={() => {
					onDelete(id as string)
					localStorage.removeItem(Sync_ID)
				}}
			/> */}
			<div className="flex gap-2 mb-2">
				<Input
					label="Source"
					size="sm"
					isDisabled={isSyncing}
					value={source}
					onChange={(e) => onChange(id, "source", e.target.value)}
				/>
				<Input
					label="Target"
					size="sm"
					isDisabled={isSyncing}
					value={target}
					onChange={(e) => onChange(id, "target", e.target.value)}
				/>
			</div>
			<div className="flex gap-2">
				<Textarea
					className="flex-1"
					label="Sync Keys"
					isDisabled={isSyncing}
					value={syncKeys.join("\n")}
					placeholder="key1&#10;key2&#10;..."
					onChange={(e) => onChange(id, "syncKeys", e.target.value)}
				/>
				<div className="flex flex-col gap-2">
					<Button
						className="h-[25px]"
						onPress={() => {
							onDelete(id as string)
							localStorage.removeItem(Sync_ID)
						}}
					>
						<DeleteIcon />
					</Button>
					<Button
						className="h-[65px]"
						color="warning"
						isDisabled={isSyncing}
						onPress={handleSyncOnce}
					>
						Sync
					</Button>
					{/* TODO 这个功能目前有 bug，不稳定 */}
					{/* <Button
						className="h-[45px]"
						color="warning"
						onPress={handleSwitchSync}
						// startContent={<div>{isSyncing ? "Observing..." : "Stopped"}</div>}
					>
						{isSyncing ? "Stop" : "Observe"}
					</Button> */}
				</div>
			</div>
		</motion.div>
	)
}

export default Section

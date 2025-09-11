import { Button } from "@heroui/button"
import { AddIcon, MainIcon } from "@/components/icons"

const BlockTitle = ({ onAdd }: { onAdd: () => void }) => {
	return (
		<div className="flex justify-between items-center sticky top-0 z-50 border border-blue-100 rounded-2xl px-6 py-4 bg-[rgba(255,255,255,0.2)] backdrop-blur-3xl">
			<div className="flex items-center gap-3">
				<MainIcon />
				<h1 className="font-bold text-2xl text-white">Sync Storage</h1>
			</div>
			<Button
				className="flex items-center gap-2 px-4 py-2 bg-[#006fee] text-white rounded-[14px] cursor-pointer hover:bg-[#0c78f4]"
				onPress={onAdd}
			>
				<AddIcon className="text-white" /> Add
			</Button>
		</div>
	)
}

export default BlockTitle

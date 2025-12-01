import { HeroUIProvider, ToastProvider } from "@heroui/react"
import Aurora from "@/components/aurora"
import Popup from "./popup"

function App() {
	return (
		<HeroUIProvider>
			<ToastProvider placement="top-center" />
			<div
				id="sync-storage-container"
				className="w-[560px] h-[558px] relative overflow-y-auto bg-gradient-to-br from-[#1a1f2e] via-[#1e2538] to-[#252d42] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
			>
				<Aurora
					colorStops={["#3b82f6", "#8b5cf6", "#ec4899"]}
					amplitude={0.8}
					speed={0.15}
					blend={0.8}
				/>
				<div className="absolute z-10 w-full min-h-full">
					<Popup />
				</div>
			</div>
		</HeroUIProvider>
	)
}

export default App

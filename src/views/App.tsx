import { HeroUIProvider, ToastProvider } from "@heroui/react"
import Aurora from "@/components/aurora"
import Popup from "./popup"

function App() {
	return (
		<HeroUIProvider>
			<ToastProvider placement="top-center" />
			<div
				id="sync-storage-container"
				className="w-[600px] h-[500px] relative overflow-y-auto bg-[#22272E]"
			>
				<Aurora
					colorStops={["#66e6ff", "#cda3f0", "#8a1ff4"]}
					amplitude={1.0}
					speed={0.2}
					blend={1}
				/>
				<div className="absolute z-10 w-full h-full">
					<Popup />
				</div>
			</div>
		</HeroUIProvider>
	)
}

export default App

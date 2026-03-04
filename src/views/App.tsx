import { HeroUIProvider, ToastProvider } from "@heroui/react"
import { I18nProvider } from "@/lib/i18n"
import Popup from "./popup"

function App() {
	return (
		<I18nProvider>
			<HeroUIProvider>
				<ToastProvider placement="top-center" />
				<div
					id="sync-storage-container"
					className="w-[580px] h-[558px] relative overscroll-contain overflow-y-auto bg-[#191f1d] scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent selection:bg-emerald-500/30"
				>
					<div className="absolute z-10 w-full min-h-full">
						<Popup />
					</div>
				</div>
			</HeroUIProvider>
		</I18nProvider>
	)
}

export default App

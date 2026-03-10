import { HeroUIProvider, ToastProvider } from "@heroui/react"
import { I18nProvider } from "@/lib/i18n"
import Popup from "./popup"
import { useEffect, useState } from "react"

function App() {
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		// 初始化主题
		const darkMode = localStorage.getItem("sync-storage-dark-mode") === "true"
		if (darkMode) {
			document.documentElement.classList.add("dark")
		} else {
			document.documentElement.classList.remove("dark")
		}
		setMounted(true)
	}, [])

	if (!mounted) {
		return null
	}

	return (
		<I18nProvider>
			<HeroUIProvider>
				<ToastProvider placement="top-center" />
				<div
					id="sync-storage-container"
					className="w-[580px] h-[558px] relative overscroll-contain overflow-y-auto bg-background text-foreground scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent selection:bg-emerald-500/30"
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

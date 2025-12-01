import { createContext, type ReactNode, useContext, useMemo } from "react"
import { type Locale, locales, type TranslationKey } from "./locales"

// Get browser locale
function getBrowserLocale(): Locale {
	const lang = navigator.language || (navigator as any).userLanguage || "en"
	// Support zh-CN, zh-TW, zh and other Chinese variants
	if (lang.startsWith("zh")) {
		return "zh-CN"
	}
	return "en"
}

// Context
interface I18nContextType {
	locale: Locale
	t: (key: TranslationKey | string) => string
}

const I18nContext = createContext<I18nContextType | null>(null)

// Provider
export function I18nProvider({ children }: { children: ReactNode }) {
	const locale = useMemo(() => getBrowserLocale(), [])

	const t = useMemo(() => {
		return (key: TranslationKey | string): string => {
			const translations = locales[locale] as Record<string, string>
			const fallback = locales["en"] as Record<string, string>
			return translations[key] || fallback[key] || key
		}
	}, [locale])

	return <I18nContext.Provider value={{ locale, t }}>{children}</I18nContext.Provider>
}

// Hook
export function useI18n() {
	const context = useContext(I18nContext)
	if (!context) {
		throw new Error("useI18n must be used within I18nProvider")
	}
	return context
}

// Export types
export type { Locale, TranslationKey }

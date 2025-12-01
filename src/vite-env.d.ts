/// <reference types="vite/client" />

declare global {
	interface Window {
		__localStorage_observer: number | null
		__storage_event_handler: ((event: StorageEvent) => void) | null
	}
}

export {}

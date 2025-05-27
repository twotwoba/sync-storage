/// <reference types="chrome"/>

import { useLocalStorage } from '@uidotdev/usehooks'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'
import { Textarea } from './components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'

// 构建URL匹配模式
function buildUrlPattern(url: string) {
    // 如果是localhost，使用http/https模式
    if (url.startsWith('localhost:')) {
        return [`http://${url}/*`, `http://${url}`, `https://${url}/*`, `https://${url}`]
    }
    // 其他域名使用通配符模式
    return [`*://${url}/*`, `*://${url}`]
}

function App() {
    const [is_running, setIsRunning] = useLocalStorage('is_running', false)
    const [monitor_target, setMonitorTarget] = useLocalStorage('monitor_target', '')
    const [monitor_source, setMonitorSource] = useLocalStorage('monitor_source', '')
    const [sync_keys, setSyncKeys] = useLocalStorage<string[]>('sync_keys', [])

    // 处理启动/停止监听
    const handleToggleMonitoring = async () => {
        try {
            const newState = !is_running
            if (newState) {
                // 启动监听
                await chrome.runtime.sendMessage({
                    type: 'START_MONITORING',
                    config: {
                        monitorSource: monitor_source,
                        monitorTarget: monitor_target,
                        syncKeys: sync_keys,
                        isRunning: true
                    }
                })
            } else {
                // 停止监听
                await chrome.runtime.sendMessage({
                    type: 'STOP_MONITORING'
                })
            }
            setIsRunning(newState)
        } catch (error) {
            console.error('Failed to toggle monitoring:', error)
        }
    }

    // 监听来自background的消息
    useEffect(() => {
        const messageListener = (message: any) => {
            console.log('🔥 [DEBUG] messageListener --->', message)
            if (message.type === 'STORAGE_CHANGED') {
                // 当监听到storage变化时，更新目标页面的localStorage
                const targetUrls = buildUrlPattern(monitor_target)
                chrome.tabs.query({ url: targetUrls }, (tabs) => {
                    if (tabs.length > 0) {
                        chrome.scripting.executeScript({
                            target: { tabId: tabs[0].id! },
                            func: (key: string, value: string) => {
                                localStorage.setItem(key, value)
                            },
                            args: [message.key, message.value]
                        })
                    }
                })
            }
        }

        chrome.runtime.onMessage.addListener(messageListener)
        return () => {
            chrome.runtime.onMessage.removeListener(messageListener)
        }
    }, [monitor_target])

    return (
        <div className="w-full px-4 py-2">
            <div className="flex justify-center gap-2">
                <div className="flex-1">
                    <Label>获取地址</Label>
                    <Input
                        type="text"
                        className="w-full"
                        placeholder="Example: www.google.com"
                        value={monitor_source}
                        onChange={(e) => setMonitorSource(e.target.value)}
                    />
                </div>
                <div className="flex-1">
                    <Label>接收地址</Label>
                    <Input
                        type="text"
                        className="w-full"
                        placeholder="Example: localhost:8080"
                        value={monitor_target}
                        onChange={(e) => setMonitorTarget(e.target.value)}
                    />
                </div>
            </div>
            <div>
                <Label>需同步keys</Label>
                <Textarea
                    placeholder="Input sync keys, one per line"
                    value={sync_keys.join('\n')}
                    onChange={(e) => setSyncKeys(e.target.value.split('\n').filter(Boolean))}
                />
            </div>

            <Button
                className="mt-4"
                onClick={handleToggleMonitoring}
                disabled={!monitor_source || !monitor_target || sync_keys.length === 0}>
                {is_running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {is_running ? '停止监听' : '启动监听'}
            </Button>
        </div>
    )
}

export default App

/// <reference types="chrome"/>

import { useLocalStorage } from '@uidotdev/usehooks'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { CircleMinus, CirclePlus, Loader2 } from 'lucide-react'

interface PannelProps {
    index: number | string
    total: number
    addBlock: () => void
    removeBlock: () => void
}

function Pannel(props: PannelProps) {
    const { index, total, addBlock, removeBlock } = props
    const RUNNING_KEY = `is_running_${index}`
    const MONITOR_TARGET_KEY = `monitor_target_${index}`
    const MONITOR_SOURCE_KEY = `monitor_source_${index}`
    const SYNC_KEYS_KEY = `sync_keys_${index}`
    const [is_running, setIsRunning] = useLocalStorage(RUNNING_KEY, false)
    const [monitor_target, setMonitorTarget] = useLocalStorage(MONITOR_TARGET_KEY, '')
    const [monitor_source, setMonitorSource] = useLocalStorage(MONITOR_SOURCE_KEY, '')
    const [sync_keys, setSyncKeys] = useLocalStorage<string[]>(SYNC_KEYS_KEY, [])

    // 处理启动/停止监听
    const handleToggleMonitoring = async () => {
        try {
            const newState = !is_running
            if (newState) {
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
                await chrome.runtime.sendMessage({
                    type: 'STOP_MONITORING'
                })
            }
            setIsRunning(newState)
        } catch (error) {
            console.error('Failed to toggle monitoring:', error)
        }
    }

    return (
        <div className="w-full px-4 py-2">
            <div className="flex justify-center gap-2">
                <div className="flex-1">
                    <Label>Source</Label>
                    <Input
                        type="text"
                        className="w-full"
                        placeholder="Example: www.google.com"
                        value={monitor_source}
                        onChange={(e) => setMonitorSource(e.target.value)}
                    />
                </div>
                <div className="flex-1">
                    <Label>Target</Label>
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
                <Label>Keys</Label>
                <Textarea
                    placeholder="Input sync keys, one per line"
                    value={sync_keys.join('\n')}
                    onChange={(e) => setSyncKeys(e.target.value.split('\n').filter(Boolean))}
                />
            </div>

            <div className="mt-4 flex justify-between">
                <div>
                    {index === total && (
                        <Button className="mr-2" onClick={addBlock}>
                            <CirclePlus />
                        </Button>
                    )}
                    {total > 1 && (
                        <Button onClick={removeBlock} disabled={is_running}>
                            <CircleMinus />
                        </Button>
                    )}
                </div>
                <div>
                    <Button
                        className="ml-2"
                        onClick={handleToggleMonitoring}
                        disabled={!monitor_source || !monitor_target || sync_keys.length === 0}>
                        {is_running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {is_running ? 'Stop' : 'Sync'}
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default Pannel

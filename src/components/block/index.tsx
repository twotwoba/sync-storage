/// <reference types="chrome"/>

import { useLocalStorage } from '@uidotdev/usehooks'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { ChevronDown, CircleMinus, CirclePlus, Loader2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'

interface BlockProps {
    index: number | string
    total: number
    addBlock: () => void
    removeBlock: () => void
}

function Block(props: BlockProps) {
    const { index, total, addBlock, removeBlock } = props
    const RUNNING_KEY = `is_running_${index}`
    const MONITOR_TARGET_KEY = `monitor_target_${index}`
    const MONITOR_SOURCE_KEY = `monitor_source_${index}`
    const SYNC_KEYS_KEY = `sync_keys_${index}`
    const SOURCE_PROTOCOL_KEY = `source_protocol_${index}`
    const TARGET_PROTOCOL_KEY = `target_protocol_${index}`
    const [is_running, setIsRunning] = useLocalStorage(RUNNING_KEY, false)
    const [monitor_target, setMonitorTarget] = useLocalStorage(MONITOR_TARGET_KEY, '')
    const [monitor_source, setMonitorSource] = useLocalStorage(MONITOR_SOURCE_KEY, '')
    const [sync_keys, setSyncKeys] = useLocalStorage<string[]>(SYNC_KEYS_KEY, [])
    const [source_protocol, setSourceProtocol] = useLocalStorage(SOURCE_PROTOCOL_KEY, 'http://')
    const [target_protocol, setTargetProtocol] = useLocalStorage(TARGET_PROTOCOL_KEY, 'http://')

    // switch monitoring
    const handleToggleMonitoring = async () => {
        try {
            const newState = !is_running
            if (newState) {
                await chrome.runtime.sendMessage({
                    type: 'START_MONITORING',
                    config: {
                        monitorSource: monitor_source,
                        monitorTarget: monitor_target,
                        sourceProtocol: source_protocol,
                        targetProtocol: target_protocol,
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
                    <div className="flex rounded-lg shadow-sm shadow-black/5">
                        <div className="relative">
                            <select
                                value={source_protocol}
                                onChange={(e) => setSourceProtocol(e.target.value)}
                                className="peer border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:text-foreground focus-visible:ring-ring/20 inline-flex h-full appearance-none items-center rounded-none rounded-s-lg border ps-3 pe-8 text-sm transition-shadow focus:z-10 focus-visible:ring-[3px] focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="Protocol">
                                <option value="http://">http://</option>
                                <option value="https://">https://</option>
                            </select>
                            <span className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 end-0 z-10 flex h-full w-9 items-center justify-center peer-disabled:opacity-50">
                                <ChevronDown size={16} strokeWidth={2} aria-hidden="true" role="img" />
                            </span>
                        </div>
                        <Input
                            className="-ms-px rounded-s-none shadow-none focus-visible:z-10"
                            placeholder="dev-manage.baidu.com"
                            type="text"
                            value={monitor_source}
                            onChange={(e) => setMonitorSource(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1">
                    <Label>Target</Label>
                    <div className="flex rounded-lg shadow-sm shadow-black/5">
                        <div className="relative">
                            <select
                                value={target_protocol}
                                onChange={(e) => setTargetProtocol(e.target.value)}
                                className="peer border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:text-foreground focus-visible:ring-ring/20 inline-flex h-full appearance-none items-center rounded-none rounded-s-lg border ps-3 pe-8 text-sm transition-shadow focus:z-10 focus-visible:ring-[3px] focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="Protocol">
                                <option value="http://">http://</option>
                                <option value="https://">https://</option>
                            </select>
                            <span className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 end-0 z-10 flex h-full w-9 items-center justify-center peer-disabled:opacity-50">
                                <ChevronDown size={16} strokeWidth={2} aria-hidden="true" role="img" />
                            </span>
                        </div>
                        <Input
                            className="-ms-px rounded-s-none shadow-none focus-visible:z-10"
                            placeholder="dev-manage.baidu.com"
                            type="text"
                            value={monitor_target}
                            onChange={(e) => setMonitorTarget(e.target.value)}
                        />
                    </div>
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
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Button
                                    className="ml-2"
                                    onClick={handleToggleMonitoring}
                                    disabled={!monitor_source || !monitor_target || sync_keys.length === 0}>
                                    {is_running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {is_running ? 'Stop' : 'Sync'}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Make sure you've already open the Target tab</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
        </div>
    )
}

export default Block

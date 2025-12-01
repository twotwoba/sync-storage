import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { addToast, Tooltip } from "@heroui/react";
import { useLocalStorage } from "@uidotdev/usehooks";
import { motion } from "framer-motion";
import { type FC, useId } from "react";
import { DeleteIcon, SyncIcon, ArrowRightIcon, CopyIcon } from "@/components/icons";

export type SectionItem = {
    id: string | undefined;
    index: number;

    source: string;
    target: string;
    syncKeys: string[];

    onChange: (
        id: string | undefined,
        field: "source" | "target" | "syncKeys" | number,
        value: string,
    ) => void;
    onDelete: (id: string) => void;
    onCopy: (source: string, target: string, syncKeys: string[]) => void;
};

const Section: FC<SectionItem> = ({
    index,
    id,
    source,
    target,
    syncKeys,
    onChange,
    onDelete,
    onCopy,
}) => {
    const uniqueId = useId();

    // set sycn item unique id
    if (id?.startsWith("temp-")) {
        onChange(id, index, uniqueId);
    }

    // sync control unique id
    const Sync_ID = `sync_storage_section_${id}`;
    const [isSyncing, setIsSyncing] = useLocalStorage(Sync_ID, false);
    const validate = () => {
        if (
            !source.trim() ||
            !target.trim() ||
            !syncKeys.filter((item) => item.trim().length > 0).length
        ) {
            addToast({
                title: "提示",
                description: "源地址、目标地址和同步键不能为空！",
                timeout: 1500,
                color: "warning",
                radius: "lg",
                shouldShowTimeoutProgress: true,
                classNames: {
                    motionDiv: "w-[400px]",
                },
            });
            return false;
        }
        return true;
    };
    const handleSyncOnce = () => {
        if (validate()) {
            chrome.runtime.sendMessage(
                {
                    type: "sync_once",
                    payload: { source, target, keys: syncKeys },
                },
                (response: boolean) => {
                    addToast({
                        title: "成功",
                        description: "同步完成！",
                        timeout: 1200,
                        color: "success",
                        radius: "lg",
                        shouldShowTimeoutProgress: true,
                    });
                },
            );
        }
    };
    const handleSwitchSync = () => {
        if (validate()) {
            if (isSyncing) {
                localStorage.removeItem(Sync_ID);
                chrome.runtime.sendMessage({ type: "cleanup_listener" });
            } else {
                chrome.runtime.sendMessage({
                    type: "sync_observe",
                    payload: { source, target, keys: syncKeys },
                });
            }
            setIsSyncing(!isSyncing);
        }
    };

    chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
        if (message.type === "cleanup_success") {
            localStorage.removeItem(Sync_ID);
            setIsSyncing(false);
        }
        return true;
    });

    return (
        <motion.div
            className="relative rounded-2xl mt-3 bg-gradient-to-br from-[rgba(255,255,255,0.1)] to-[rgba(255,255,255,0.05)] backdrop-blur-lg border border-white/10 overflow-hidden group hover:border-white/20 transition-all duration-300"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{
                duration: 0.25,
                ease: "easeOut",
            }}
            layout="position"
        >
            {/* 顶部装饰条 */}
            <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-60" />

            <div className="p-4">
                {/* 源和目标输入区域 */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1">
                        <Input
                            label="源地址 (Source)"
                            placeholder="https://source-site.com"
                            size="sm"
                            isDisabled={isSyncing}
                            value={source}
                            onChange={(e) =>
                                onChange(id, "source", e.target.value)
                            }
                            classNames={{
                                inputWrapper:
                                    "!bg-white/5 border-white/10 !py-1 data-[hover=true]:!bg-white/10 data-[focus=true]:!bg-white/10 data-[focus=true]:!border-sky-500/50 transition-colors",
                                input: "!text-white/80 placeholder:text-white/30",
                                label: "!text-white font-medium",
                            }}
                        />
                    </div>
                    <div className="flex-shrink-0">
                        <ArrowRightIcon className="text-white/40" />
                    </div>
                    <div className="flex-1">
                        <Input
                            label="目标地址 (Target)"
                            placeholder="https://target-site.com"
                            size="sm"
                            isDisabled={isSyncing}
                            value={target}
                            onChange={(e) =>
                                onChange(id, "target", e.target.value)
                            }
                            classNames={{
                                inputWrapper:
                                    "!bg-white/5 border-white/10 !py-1 data-[hover=true]:!bg-white/10 data-[focus=true]:!bg-white/10 data-[focus=true]:!border-sky-500/50 transition-colors",
                                input: "!text-white/80 placeholder:text-white/30",
                                label: "!text-white font-medium",
                            }}
                        />
                    </div>
                </div>

                {/* 同步键和操作按钮 */}
                <div className="flex gap-3">
                    <Textarea
                        className="flex-1"
                        label="同步键名 (Keys)"
                        isDisabled={isSyncing}
                        value={syncKeys.join("\n")}
                        placeholder="输入要同步的 key，每行一个&#10;例如：&#10;token&#10;userInfo"
                        minRows={3}
                        maxRows={5}
                        onChange={(e) =>
                            onChange(id, "syncKeys", e.target.value)
                        }
                        classNames={{
                            inputWrapper:
                                "!bg-white/5 border-white/10 data-[hover=true]:!bg-white/10 data-[focus=true]:!bg-white/10 data-[focus=true]:!border-sky-500/50 transition-colors",
                            input: "!text-white/80 placeholder:text-white/30 text-sm",
                            label: "!text-white font-medium",
                        }}
                    />
                    <div className="flex flex-col gap-2 justify-end">
                        <Tooltip content="立即同步" placement="left">
                            <Button
                                className="h-[42px] min-w-[52px] bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                                isDisabled={isSyncing}
                                onPress={handleSyncOnce}
                            >
                                <SyncIcon className="w-5 h-5" />
                            </Button>
                        </Tooltip>
                        <div className="flex gap-2">
                            <Tooltip content="复制此规则" placement="bottom">
                                <Button
                                    className="h-[42px] min-w-[42px] bg-white/5 hover:bg-blue-500/20 text-white/60 hover:text-blue-400 rounded-xl border border-white/10 hover:border-blue-500/30 transition-all duration-200"
                                    onPress={() => onCopy(source, target, syncKeys)}
                                >
                                    <CopyIcon className="w-4 h-4" />
                                </Button>
                            </Tooltip>
                            <Tooltip content="删除此规则" placement="bottom">
                                <Button
                                    className="h-[42px] min-w-[42px] bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 rounded-xl border border-white/10 hover:border-red-500/30 transition-all duration-200"
                                    onPress={() => {
                                        onDelete(id as string);
                                        localStorage.removeItem(Sync_ID);
                                    }}
                                >
                                    <DeleteIcon className="w-4 h-4" />
                                </Button>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default Section;

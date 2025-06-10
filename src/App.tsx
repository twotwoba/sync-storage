/// <reference types="chrome"/>

import { useLocalStorage } from '@uidotdev/usehooks'
import Block from './components/block'
import { Button } from './components/ui/button'
import { CirclePlus } from 'lucide-react'
import { TextGenerateEffect } from './components/ui/text-generate-effect'

function App() {
    const [counter, setCounter] = useLocalStorage('global_counter', 0)
    const [blocks, setBlocks] = useLocalStorage('blocks', [counter])

    const handleAddBlock = () => {
        setCounter((prevCounter) => prevCounter + 1)
        setBlocks((prevBlocks) => [...prevBlocks, counter + 1])
    }

    const handleRemoveBlock = (index: number) => {
        setBlocks((prevBlocks) => {
            const newBlocks = [...prevBlocks]
            newBlocks.splice(index, 1)
            return newBlocks
        })
    }
    return (
        <>
            <div className="glass sticky top-0 z-100 flex w-full items-center justify-between bg-white/50 p-4 backdrop-blur-md">
                <TextGenerateEffect words="Sync Storage" />
                <Button className="bg-red-300 hover:bg-red-500" onClick={handleAddBlock}>
                    <CirclePlus />
                    Add Block
                </Button>
            </div>
            {blocks.map((_, index) => (
                <Block
                    key={_}
                    id={_}
                    index={index}
                    total={blocks.length}
                    addBlock={handleAddBlock}
                    removeBlock={handleRemoveBlock}
                />
            ))}
        </>
    )
}

export default App

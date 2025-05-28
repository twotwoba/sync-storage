/// <reference types="chrome"/>

import { useLocalStorage } from '@uidotdev/usehooks'
import Block from './components/block'

function App() {
    const [blocks, setBlocks] = useLocalStorage('blocks', 1)

    const handleAddBlock = () => {
        setBlocks(blocks + 1)
    }

    const handleRemoveBlock = () => {
        setBlocks(blocks - 1)
    }
    return (
        <>
            {Array.from({ length: blocks }).map((_, index) => (
                <Block
                    key={index}
                    index={index + 1}
                    total={blocks}
                    addBlock={handleAddBlock}
                    removeBlock={handleRemoveBlock}
                />
            ))}
        </>
    )
}

export default App

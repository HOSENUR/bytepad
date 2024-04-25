import { Terminal as XTerm } from '@xterm/xterm';
import { useEffect, useRef } from 'react';
import { FitAddon } from '@xterm/addon-fit';
import { AttachAddon } from "@xterm/addon-attach";

const fitAddon = new FitAddon();

export default function Terminal({ tag, container, previewStatus }: { tag: string | undefined, container: boolean, previewStatus: boolean }) {
    const terminalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        console.log('terminal', tag, container, previewStatus);

        if (!terminalRef.current || !tag || !container || !previewStatus) return;

        const term = new XTerm({
            rows: 10,
            convertEol: true,
            cursorStyle: 'underline',
            cursorBlink: true,
            fontFamily: 'monospace',
            fontSize: 14,
            fontWeight: '600',
            theme: {
                background: '#2b2b2b',
                foreground: '#FFFFFF',
                cursor: '#00FF00',
            },
        });

        const socket = new WebSocket(`wss://terminal.bytepad.pro/containers/${tag}/attach/ws?stream=1&stdout=1&stdin=1&logs=1`);
        const attachAddon = new AttachAddon(socket);

        term.loadAddon(attachAddon);
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        fitAddon.fit();

        return () => {
            term.dispose();
            attachAddon.dispose();
        };
    }, [tag, container, previewStatus]);


    return (
        <div className='bg-black h-36 text-white' ref={terminalRef}>
        </div>
    );
}

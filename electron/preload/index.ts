import { ipcRenderer, contextBridge, webUtils } from 'electron';

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
    on(...args: Parameters<typeof ipcRenderer.on>) {
        const [channel, listener] = args;
        return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
    },
    off(...args: Parameters<typeof ipcRenderer.off>) {
        const [channel, ...omit] = args;
        return ipcRenderer.off(channel, ...omit);
    },
    send(...args: Parameters<typeof ipcRenderer.send>) {
        const [channel, ...omit] = args;
        return ipcRenderer.send(channel, ...omit);
    },
    invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
        const [channel, ...omit] = args;
        return ipcRenderer.invoke(channel, ...omit);
    },
    once(...args: Parameters<typeof ipcRenderer.once>) {
        const [channel, listener] = args;
        return ipcRenderer.once(channel, (event, ...args) => listener(event, ...args));
    },

    // You can expose other APTs you need here.
    // ...
});

// Expose webUtils API
contextBridge.exposeInMainWorld('webUtils', {
    getPathForFile: (file: File) => webUtils.getPathForFile(file),
});

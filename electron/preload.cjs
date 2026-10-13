const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("notch", {
  setExpanded: (payload) => ipcRenderer.invoke("notch:set-expanded", payload),
  setPassthrough: (pass) => ipcRenderer.invoke("notch:set-passthrough", pass),
  reposition: () => ipcRenderer.invoke("notch:reposition"),
  onBlur: (cb) => {
    const handler = () => cb()
    ipcRenderer.on("notch:window-blur", handler)
    return () => ipcRenderer.removeListener("notch:window-blur", handler)
  },
  platform: process.platform,
  spotify: {
    status: () => ipcRenderer.invoke("spotify:status"),
    connect: () => ipcRenderer.invoke("spotify:connect"),
    disconnect: () => ipcRenderer.invoke("spotify:disconnect"),
    action: (action) => ipcRenderer.invoke("spotify:action", action),
  },
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    set: (partial) => ipcRenderer.invoke("settings:set", partial),
    reset: () => ipcRenderer.invoke("settings:reset"),
  },
})

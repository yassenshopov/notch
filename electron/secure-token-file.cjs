const fs = require("fs")
const { safeStorage } = require("electron")

const LEGACY_JSON_PREFIX = 0x7b // '{'

/**
 * @param {string} filePath
 * @returns {object | null}
 */
function readTokenFile(filePath) {
  try {
    const buf = fs.readFileSync(filePath)
    if (!buf.length) return null
    if (buf[0] === LEGACY_JSON_PREFIX) {
      const legacy = JSON.parse(buf.toString("utf8"))
      writeTokenFile(filePath, legacy)
      return legacy
    }
    if (!safeStorage.isEncryptionAvailable()) {
      return null
    }
    const json = safeStorage.decryptString(buf)
    return JSON.parse(json)
  } catch {
    return null
  }
}

/** @param {string} filePath @param {object} data */
function writeTokenFile(filePath, data) {
  const json = JSON.stringify(data)
  if (safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(filePath, safeStorage.encryptString(json))
    return
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8")
}

/** @param {string} filePath */
function clearTokenFile(filePath) {
  try {
    fs.unlinkSync(filePath)
  } catch {
    // ignore
  }
}

module.exports = { readTokenFile, writeTokenFile, clearTokenFile }
/**
 * Strip local-only secrets before persisting settings to Neon KV.
 *
 * @param {unknown} settings
 */
function sanitizeSettingsForNeon(settings) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return settings
  }
  const copy = structuredClone(settings)
  if (copy.wifiSense && typeof copy.wifiSense === "object") {
    copy.wifiSense = { ...copy.wifiSense, token: "" }
  }
  return copy
}

module.exports = { sanitizeSettingsForNeon }
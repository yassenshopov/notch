/** @param {unknown} url */
function isHttpUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url.trim())
}

module.exports = { isHttpUrl }
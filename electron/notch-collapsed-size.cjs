function isCornerForm(form) {
  return form === "corner-tl" || form === "corner-tr"
}

function collapsedContentDimensions(form, width, height) {
  if (!isCornerForm(form)) {
    return { width, height }
  }
  const side = Math.max(width, height)
  return { width: side, height: side }
}

module.exports = {
  isCornerForm,
  collapsedContentDimensions,
}

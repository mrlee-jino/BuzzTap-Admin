// Date input and database calendar dates must not shift with UTC conversion.
export function localCalendarDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function calendarDate(value) {
  return value ? String(value).slice(0, 10) : ""
}

export function previewStatus(item, today) {
  const status = (item.status || "").toUpperCase()
  const endDate = calendarDate(item.end_date)
  return status === "PUBLISHED" && endDate && endDate < today ? "EXPIRED" : status
}

export function filterPreviewPosts(items, view, today) {
  return items.filter((item) => {
    const status = previewStatus(item, today)
    if (view === "archive") {
      return status === "ARCHIVED" || ((item.status || "").toUpperCase() === "PUBLISHED" && status === "EXPIRED")
    }
    const startDate = calendarDate(item.start_date)
    return status === "PUBLISHED" && (!startDate || startDate <= today)
  })
}

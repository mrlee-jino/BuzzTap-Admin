export function formatAccountNumber(value) {
  const digits = String(value || "").replace(/\s/g, "")
  if (!/^\d{16}$/.test(digits)) return value || "Not assigned"
  return digits.match(/.{4}/g).join(" ")
}

import { createContext, useContext, useMemo, useState } from "react"

const MAX_SUPPLY = 100000
const AdminDataContext = createContext(null)

function nowLabel() {
  return new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function AdminDataProvider({ children }) {
  const [treasury, setTreasury] = useState({ issued: 0, reserved: 0, pendingSettlement: 0 })
  const [businesses, setBusinesses] = useState([])
  const [customers, setCustomers] = useState([])
  const [ledger, setLedger] = useState([])
  const [settlementRequests, setSettlementRequests] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [contentItems, setContentItems] = useState([])

  const appendAudit = (event) => {
    setAuditLogs((current) => [{ id: `AUD-${Date.now()}`, time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), actor: "Admin", status: "Success", ...event }, ...current])
  }

  const addLedger = (entry) => setLedger((current) => [{ id: `LED-${Date.now()}`, createdAt: nowLabel(), status: "COMPLETED", ...entry }, ...current])
  const ensureSupply = (amount) => Number(amount) > 0 && treasury.issued + Number(amount) <= MAX_SUPPLY

  const issueBuzzPoints = ({ amount, reason, reference, notes }) => {
    const value = Number(amount)
    if (!ensureSupply(value)) return { ok: false, error: "Amount exceeds available maximum supply." }
    setTreasury((current) => ({ ...current, issued: current.issued + value, reserved: current.reserved + value }))
    addLedger({ type: "SYSTEM_ISSUANCE", amount: value, source: "Treasury", destination: "Reserve", reason, reference, notes })
    appendAudit({ type: "Treasury", action: "BuzzPoints issued", description: `${value.toLocaleString()} BuzzPoints issued to reserve.`, target: reference || "Treasury" })
    return { ok: true }
  }

  const loadCustomer = ({ customerId, amount, reason, reference, notes }) => {
    const value = Number(amount)
    const customer = customers.find((item) => item.id === customerId)
    if (!customer) return { ok: false, error: "Select a customer." }
    if (!ensureSupply(value)) return { ok: false, error: "Amount exceeds available maximum supply." }
    setTreasury((current) => ({ ...current, issued: current.issued + value }))
    setCustomers((current) => current.map((item) => item.id === customerId ? { ...item, balance: item.balance + value } : item))
    addLedger({ type: "CUSTOMER_LOAD", amount: value, source: "Treasury", destination: customerId, reason, reference, notes })
    appendAudit({ type: "Treasury", action: "Customer load recorded", description: `${value.toLocaleString()} BuzzPoints loaded to ${customerId}.`, target: customerId })
    return { ok: true }
  }

  const purchaseBusiness = ({ businessId, amount, reason }) => {
    const value = Number(amount)
    const business = businesses.find((item) => item.id === businessId)
    if (!business) return { ok: false, error: "Select a business." }
    if (!ensureSupply(value)) return { ok: false, error: "Amount exceeds available maximum supply." }
    if (business.inventory + value > business.allocation) return { ok: false, error: "Purchase exceeds the business allocation." }
    setTreasury((current) => ({ ...current, issued: current.issued + value }))
    setBusinesses((current) => current.map((item) => item.id === businessId ? { ...item, inventory: item.inventory + value } : item))
    addLedger({ type: "BUSINESS_PURCHASE", amount: value, source: "Treasury", destination: businessId, reason, reference: `PO-${businessId}`, notes: "" })
    appendAudit({ type: "Treasury", action: "Business purchase recorded", description: `${value.toLocaleString()} BuzzPoints allocated to ${business.name}.`, target: businessId })
    return { ok: true }
  }

  const distributeBusinessPoints = ({ businessId, customerId, amount }) => {
    const value = Number(amount)
    const business = businesses.find((item) => item.id === businessId)
    if (!business || business.inventory < value) return { ok: false, error: "Distribution exceeds business inventory." }
    setBusinesses((current) => current.map((item) => item.id === businessId ? { ...item, inventory: item.inventory - value, distributed: item.distributed + value } : item))
    setCustomers((current) => current.map((item) => item.id === customerId ? { ...item, balance: item.balance + value } : item))
    addLedger({ type: "CUSTOMER_LOAD", amount: value, source: businessId, destination: customerId, reason: "Business distribution", reference: `DIST-${Date.now()}`, notes: "" })
    return { ok: true }
  }

  const updateCustomerStatus = (customerId, status) => {
    setCustomers((current) => current.map((item) => item.id === customerId ? { ...item, status } : item))
    appendAudit({ type: "User", action: `Customer ${status.toLowerCase()}`, description: `Customer status changed to ${status}.`, target: customerId })
  }

  const updateSettlement = (requestId, status) => {
    setSettlementRequests((current) => current.map((item) => item.id === requestId ? { ...item, status } : item))
    const request = settlementRequests.find((item) => item.id === requestId)
    if (request && ["APPROVED", "REJECTED"].includes(status)) setTreasury((current) => ({ ...current, pendingSettlement: Math.max(0, current.pendingSettlement - request.amount) }))
    appendAudit({ type: "Settlement", action: `Settlement ${status.toLowerCase()}`, description: `Settlement request ${requestId} was ${status.toLowerCase()}.`, target: requestId, status: status === "REJECTED" ? "Warning" : "Success" })
  }

  const requestSettlementInformation = (requestId) => {
    setSettlementRequests((current) => current.map((item) => item.id === requestId ? { ...item, status: "INFO_REQUESTED" } : item))
    appendAudit({ type: "Settlement", action: "Settlement information requested", description: `Additional information was requested for ${requestId}.`, target: requestId, status: "Warning" })
  }

  const updateContent = (contentId, status, rejectedReason = "") => {
    setContentItems((current) => current.map((item) => item.id === contentId ? { ...item, status, rejectedReason } : item))
    appendAudit({ type: "Content", action: `Content ${status.toLowerCase()}`, description: `Content item ${contentId} was ${status.toLowerCase()}.`, target: contentId, status: status === "REJECTED" ? "Warning" : "Success" })
  }

  const metrics = useMemo(() => {
    const businessHoldings = businesses.reduce((total, item) => total + item.inventory, 0)
    const customerHoldings = customers.reduce((total, item) => total + item.balance, 0)
    const circulation = businessHoldings + customerHoldings
    const mismatch = treasury.issued - (businessHoldings + customerHoldings + treasury.reserved + treasury.pendingSettlement)
    return { available: MAX_SUPPLY - treasury.issued, circulation, businessHoldings, customerHoldings, mismatch }
  }, [businesses, customers, treasury])

  const value = { MAX_SUPPLY, treasury, businesses, customers, ledger, settlementRequests, auditLogs, contentItems, metrics, appendAudit, issueBuzzPoints, loadCustomer, purchaseBusiness, distributeBusinessPoints, updateCustomerStatus, updateSettlement, requestSettlementInformation, updateContent }
  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>
}

function useAdminData() {
  const context = useContext(AdminDataContext)
  if (!context) throw new Error("useAdminData must be used inside AdminDataProvider")
  return context
}

// eslint-disable-next-line react-refresh/only-export-components
export { AdminDataProvider, useAdminData }

/**
 * Platform layout — super admin only.
 * Middleware handles the isPlatformAdmin check.
 */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 220, borderRight: "1px solid #e5e7eb", padding: "1rem", background: "#111" }}>
        <div style={{ fontWeight: 700, color: "#fff", marginBottom: "1rem" }}>⚙ Super Admin</div>
        <nav style={{ color: "#ccc" }}>
          <a href="/platform/organizations" style={{ display: "block", padding: "0.25rem 0", color: "inherit" }}>Organisationer</a>
          <a href="/platform/users" style={{ display: "block", padding: "0.25rem 0", color: "inherit" }}>Användare</a>
          <a href="/platform/audit" style={{ display: "block", padding: "0.25rem 0", color: "inherit" }}>Audit log</a>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: "1.5rem" }}>{children}</main>
    </div>
  )
}

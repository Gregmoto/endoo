"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Member = {
  id: string
  role: "owner" | "admin" | "member" | "viewer"
  isPrimary: boolean
  createdAt: string
  user: { id: string; fullName: string; email: string; avatarUrl: string | null; lastLoginAt: string | null }
}

type Invitation = {
  id: string
  email: string
  role: "owner" | "admin" | "member" | "viewer"
  expiresAt: string
  createdAt: string
  inviteUrl?: string
  invitedByUser?: { fullName: string; email: string }
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Ägare", admin: "Admin", member: "Medlem", viewer: "Visare",
}

const ROLE_VARIANTS: Record<string, "default" | "secondary" | "danger"> = {
  owner: "default", admin: "default", member: "secondary", viewer: "secondary",
}

export default function UsersSettingsPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member")
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState("")
  const [lastInviteUrl, setLastInviteUrl] = useState("")

  const load = useCallback(() => {
    fetch("/api/settings/users")
      .then(r => r.json())
      .then(data => {
        setMembers(data.members ?? [])
        setInvitations(data.invitations ?? [])
        setLoading(false)
      })
  }, [])

  useEffect(() => { load() }, [load])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteError("")
    setLastInviteUrl("")

    const res = await fetch("/api/settings/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    })

    const data = await res.json()
    if (!res.ok) {
      setInviteError(data.error ?? "Något gick fel")
    } else {
      setInviteEmail("")
      setLastInviteUrl(data.inviteUrl ?? "")
      load()
    }
    setInviting(false)
  }

  async function handleRoleChange(memberId: string, role: "admin" | "member" | "viewer") {
    await fetch(`/api/settings/users/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    })
    load()
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm("Ta bort denna användare från organisationen?")) return
    await fetch(`/api/settings/users/${memberId}`, { method: "DELETE" })
    load()
  }

  async function handleCancelInvitation(id: string) {
    await fetch(`/api/settings/invitations/${id}`, { method: "DELETE" })
    load()
  }

  if (loading) return <Spinner />

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Användare & roller</h1>
        <p className="text-sm text-gray-500 mt-1">{members.length} aktiva medlemmar</p>
      </div>

      {/* Members list */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Aktiva medlemmar</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Användare</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Roll</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Senast inloggad</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0">
                        {m.user.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{m.user.fullName}</p>
                        <p className="text-xs text-gray-500">{m.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    {m.role === "owner" ? (
                      <Badge variant={ROLE_VARIANTS[m.role]}>{ROLE_LABELS[m.role]}</Badge>
                    ) : (
                      <select
                        value={m.role}
                        onChange={e => handleRoleChange(m.id, e.target.value as "admin" | "member" | "viewer")}
                        className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Medlem</option>
                        <option value="viewer">Visare</option>
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500">
                    {m.user.lastLoginAt
                      ? new Intl.DateTimeFormat("sv-SE", { dateStyle: "short" }).format(new Date(m.user.lastLoginAt))
                      : "—"}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {m.role !== "owner" && (
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                      >
                        Ta bort
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Väntande inbjudningar</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">E-post</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Roll</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Utgår</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-700">{inv.email}</td>
                    <td className="px-6 py-3">
                      <Badge variant="secondary">{ROLE_LABELS[inv.role] ?? inv.role}</Badge>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {new Intl.DateTimeFormat("sv-SE", { dateStyle: "short" }).format(new Date(inv.expiresAt))}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleCancelInvitation(inv.id)}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                      >
                        Avbryt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Invite form */}
      <Card>
        <CardHeader><CardTitle>Bjud in ny användare</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">E-post</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                required
                placeholder="kollega@foretag.se"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="w-36">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Roll</label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as typeof inviteRole)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="admin">Admin</option>
                <option value="member">Medlem</option>
                <option value="viewer">Visare</option>
              </select>
            </div>
            <Button type="submit" loading={inviting}>Skicka inbjudan</Button>
          </form>

          {inviteError && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{inviteError}</p>
          )}

          {lastInviteUrl && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-xs font-medium text-green-800 mb-1">Inbjudningslänk (skicka manuellt tills vidare)</p>
              <p className="text-xs font-mono text-green-700 break-all">{lastInviteUrl}</p>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-2">Rollbehörigheter</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500">
              <span><strong className="text-gray-700">Ägare</strong> — fullständig kontroll inkl. fakturering</span>
              <span><strong className="text-gray-700">Admin</strong> — hantera allt utom fakturering/radering</span>
              <span><strong className="text-gray-700">Medlem</strong> — skapa och hantera fakturor</span>
              <span><strong className="text-gray-700">Visare</strong> — läsrättigheter</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Spinner() {
  return (
    <div className="p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

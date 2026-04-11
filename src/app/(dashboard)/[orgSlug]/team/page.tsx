"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { initials, stringToColor, formatDate } from "@/lib/utils"

type Member = {
  id: string
  role: string
  createdAt: string
  user: { id: string; name: string | null; email: string }
}

type Invitation = {
  id: string
  email: string
  role: string
  createdAt: string
  expiresAt: string
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Ägare",
  admin: "Admin",
  member: "Medlem",
  viewer: "Läsare",
}

export default function TeamPage() {
  const params = useParams<{ orgSlug: string }>()
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("member")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [mRes, iRes] = await Promise.all([
      fetch("/api/team/members"),
      fetch("/api/invitations"),
    ])
    if (mRes.ok) setMembers(await mRes.json())
    if (iRes.ok) setInvitations(await iRes.json())
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setError("")
    setSuccess("")
    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    })
    if (res.ok) {
      setSuccess(`Inbjudan skickad till ${email}`)
      setEmail("")
      fetchData()
    } else {
      const data = await res.json()
      setError(data.error ?? "Något gick fel")
    }
    setSending(false)
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
        <p className="text-sm text-gray-500 mt-1">Hantera medlemmar och inbjudningar</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Bjud in ny medlem</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={sendInvite} className="flex gap-3">
            <input
              type="email"
              required
              placeholder="namn@foretag.se"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="admin">Admin</option>
              <option value="member">Medlem</option>
              <option value="viewer">Läsare</option>
            </select>
            <button
              type="submit"
              disabled={sending}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {sending ? "Skickar…" : "Bjud in"}
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {success && <p className="mt-2 text-sm text-green-600">{success}</p>}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Aktiva medlemmar</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-gray-50 first:border-0">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: stringToColor(m.user.email) }}
                      >
                        {initials(m.user.name ?? m.user.email)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{m.user.name ?? m.user.email}</p>
                        {m.user.name && <p className="text-xs text-gray-400">{m.user.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={m.role === "owner" ? "default" : "secondary"}>
                      {ROLE_LABELS[m.role] ?? m.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-gray-400 text-xs">Sedan {formatDate(m.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Väntande inbjudningar</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.id} className="border-t border-gray-50 first:border-0">
                    <td className="px-6 py-3">
                      <p className="text-gray-900">{inv.email}</p>
                      <p className="text-xs text-gray-400">Skickad {formatDate(inv.createdAt)}</p>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="secondary">{ROLE_LABELS[inv.role] ?? inv.role}</Badge>
                    </td>
                    <td className="px-6 py-3 text-xs text-amber-600">
                      Utgår {formatDate(inv.expiresAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect, useRef } from "react"
import type { Task, TaskStatus, TaskPriority, TaskComment } from "./types"
import {
  STATUS_LABELS, STATUS_CLS, PRIORITY_LABELS, PRIORITY_CLS,
  PRIORITY_DOT, ENTITY_LABELS, isOverdue, formatDue,
} from "./types"

interface Props {
  taskId:    string | null
  orgSlug:   string
  onClose:   () => void
  onUpdated: (task: Task) => void
  onDeleted: (id: string) => void
}

export function TaskDrawer({ taskId, orgSlug, onClose, onUpdated, onDeleted }: Props) {
  const [task,    setTask]    = useState<Task | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [comment, setComment] = useState("")
  const [posting, setPosting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDesc,  setEditDesc]  = useState("")
  const commentRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!taskId) { setTask(null); return }
    setLoading(true)
    fetch(`/api/tasks/${taskId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setTask(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [taskId])

  async function patch(data: Record<string, unknown>) {
    if (!task) return
    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      })
      if (res.ok) {
        const updated: Task = await res.json()
        setTask(updated)
        onUpdated(updated)
      }
    } finally {
      setSaving(false)
    }
  }

  async function postComment() {
    if (!task || !comment.trim()) return
    setPosting(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ body: comment.trim() }),
      })
      if (res.ok) {
        const newComment: TaskComment = await res.json()
        setTask(t => t ? { ...t, comments: [...(t.comments ?? []), newComment] } : t)
        setComment("")
      }
    } finally {
      setPosting(false)
    }
  }

  async function deleteComment(commentId: string) {
    if (!task) return
    const res = await fetch(`/api/tasks/${task.id}/comments?commentId=${commentId}`, { method: "DELETE" })
    if (res.ok) {
      setTask(t => t ? { ...t, comments: (t.comments ?? []).filter(c => c.id !== commentId) } : t)
    }
  }

  async function deleteTask() {
    if (!task || !confirm("Ta bort uppgiften?")) return
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" })
    if (res.ok) { onDeleted(task.id); onClose() }
  }

  function saveInlineEdit() {
    patch({ title: editTitle, description: editDesc || null })
    setEditing(false)
  }

  if (!taskId) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-md bg-card shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border">
          {task && (
            <button
              onClick={() => patch({ status: task.status === "done" ? "open" : "done" })}
              disabled={saving}
              className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                task.status === "done"
                  ? "bg-green-500 border-green-500 text-white"
                  : "border-input hover:border-green-400"
              }`}
            >
              {task.status === "done" && <span className="text-[10px]">✓</span>}
            </button>
          )}
          <span className="flex-1 text-sm font-semibold text-foreground truncate">
            {loading ? "Laddar…" : task?.title ?? ""}
          </span>
          <button
            onClick={deleteTask}
            className="text-muted-foreground hover:text-red-400 transition-colors text-xs px-1"
            title="Ta bort"
          >
            ✕
          </button>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-1">
            ←
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Laddar…</div>
        ) : !task ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Uppgift hittades ej</div>
        ) : (
          <div className="flex-1 overflow-y-auto">

            {/* Title / description inline edit */}
            <div className="px-5 py-4 border-b border-border/50">
              {editing ? (
                <div className="space-y-2">
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full text-base font-semibold border border-brand-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-brand-400"
                    autoFocus
                  />
                  <textarea
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    rows={4}
                    placeholder="Beskrivning…"
                    className="w-full text-sm border border rounded-lg px-3 py-2 outline-none resize-none focus:ring-1 focus:ring-brand-400"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveInlineEdit} className="text-xs font-semibold px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700">Spara</button>
                    <button onClick={() => setEditing(false)} className="text-xs px-3 py-1.5 border border rounded-lg text-muted-foreground hover:bg-muted">Avbryt</button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => { setEditTitle(task.title); setEditDesc(task.description ?? ""); setEditing(true) }}
                  className="cursor-text group"
                >
                  <h2 className={`text-base font-semibold group-hover:text-brand-700 transition-colors ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {task.title}
                  </h2>
                  {task.description ? (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{task.description}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1 italic">Klicka för att lägga till beskrivning…</p>
                  )}
                </div>
              )}
            </div>

            {/* Meta fields */}
            <div className="px-5 py-3 border-b border-border/50 space-y-3">

              {/* Status */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20 flex-shrink-0">Status</span>
                <select
                  value={task.status}
                  onChange={e => patch({ status: e.target.value })}
                  disabled={saving}
                  className="text-xs border border rounded-lg px-2 py-1 bg-card focus:outline-none focus:ring-1 focus:ring-brand-400"
                >
                  {(["open","in_progress","done","cancelled"] as TaskStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CLS[task.status]}`}>
                  {STATUS_LABELS[task.status]}
                </span>
              </div>

              {/* Priority */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20 flex-shrink-0">Prioritet</span>
                <select
                  value={task.priority}
                  onChange={e => patch({ priority: e.target.value })}
                  disabled={saving}
                  className="text-xs border border rounded-lg px-2 py-1 bg-card focus:outline-none focus:ring-1 focus:ring-brand-400"
                >
                  {(["low","normal","high","urgent"] as TaskPriority[]).map(p => (
                    <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                  ))}
                </select>
                <span className={`flex items-center gap-1 text-xs font-medium ${PRIORITY_CLS[task.priority]}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} />
                  {PRIORITY_LABELS[task.priority]}
                </span>
              </div>

              {/* Due date */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20 flex-shrink-0">Förfaller</span>
                <input
                  type="date"
                  value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                  onChange={e => patch({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="text-xs border border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
                {task.dueDate && (
                  <span className={`text-xs font-medium ${isOverdue(task) ? "text-red-600" : "text-muted-foreground"}`}>
                    {formatDue(task.dueDate)}
                  </span>
                )}
              </div>

              {/* Remind at */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20 flex-shrink-0">Påminn</span>
                <input
                  type="datetime-local"
                  value={task.remindAt ? task.remindAt.slice(0, 16) : ""}
                  onChange={e => patch({ remindAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="text-xs border border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>

              {/* Entity link */}
              {task.entityType && task.entityId && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-20 flex-shrink-0">Koppling</span>
                  <a
                    href={`/${orgSlug}/${entityPath(task.entityType, task.entityId)}`}
                    className="text-xs text-brand-600 hover:underline font-medium"
                  >
                    {ENTITY_LABELS[task.entityType]} →
                  </a>
                </div>
              )}

              {/* Assignees */}
              <div className="flex items-start gap-3">
                <span className="text-xs text-muted-foreground w-20 flex-shrink-0 mt-1">Tilldelad</span>
                <div className="flex flex-wrap gap-1">
                  {task.assignments.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">Ingen</span>
                  ) : (
                    task.assignments.map(a => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1 text-xs bg-muted text-foreground px-2 py-0.5 rounded-full"
                        title={a.user.fullName}
                      >
                        <span className="w-4 h-4 rounded-full bg-brand-400 text-white text-[9px] flex items-center justify-center font-bold">
                          {a.user.fullName[0]}
                        </span>
                        {a.user.fullName.split(" ")[0]}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Comments */}
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Kommentarer {task.comments?.length ? `(${task.comments.length})` : ""}
              </p>

              {(task.comments ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground italic mb-3">Inga kommentarer ännu</p>
              ) : (
                <div className="space-y-3 mb-4">
                  {(task.comments ?? []).map(c => (
                    <div key={c.id} className="flex gap-2.5">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center mt-0.5">
                        {c.author.fullName[0]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-foreground">{c.author.fullName}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(c.createdAt).toLocaleString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <button
                            onClick={() => deleteComment(c.id)}
                            className="ml-auto text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="text-xs text-foreground whitespace-pre-wrap">{c.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* New comment */}
              <div className="flex gap-2">
                <textarea
                  ref={commentRef}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) postComment() }}
                  rows={2}
                  placeholder="Skriv kommentar… (⌘↵ för att skicka)"
                  className="flex-1 text-xs border border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
                <button
                  onClick={postComment}
                  disabled={posting || !comment.trim()}
                  className="self-end text-xs font-semibold px-3 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 transition-colors"
                >
                  {posting ? "…" : "↵"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function entityPath(type: string, id: string): string {
  switch (type) {
    case "invoice":          return `invoices/${id}`
    case "contact":          return `contacts/${id}`
    case "supplier_invoice": return `supplier-invoices/${id}`
    case "journal":          return `journals/${id}`
    default:                 return `${type}s/${id}`
  }
}

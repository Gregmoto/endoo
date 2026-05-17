"use client"

import { useState, useEffect, useCallback } from "react"
import type { Task, TaskPriority } from "@/components/tasks/types"
import { isOverdue, formatDue, STATUS_LABELS, STATUS_CLS, PRIORITY_DOT, PRIORITY_LABELS } from "@/components/tasks/types"
import { TaskDrawer }     from "@/components/tasks/TaskDrawer"
import { TaskCreateForm } from "@/components/tasks/TaskCreateForm"
import { useParams }      from "next/navigation"

type Tab = "mine" | "all" | "unassigned" | "done"

const TABS: { value: Tab; label: string }[] = [
  { value: "mine",       label: "Mina"         },
  { value: "all",        label: "Alla"          },
  { value: "unassigned", label: "Ej tilldelade" },
  { value: "done",       label: "Avslutade"     },
]

export default function TasksPage() {
  const params  = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug

  const [tasks,      setTasks]      = useState<Task[]>([])
  const [loading,    setLoading]    = useState(true)
  const [tab,        setTab]        = useState<Tab>("mine")
  const [activeId,   setActiveId]   = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async (t: Tab) => {
    setLoading(true)
    const params = new URLSearchParams({ limit: "200" })
    if (t === "mine")       params.set("mine", "true")
    if (t === "done")       params.set("status", "done")
    if (t === "unassigned") params.set("mine", "false")
    const res = await fetch(`/api/tasks?${params}`)
    const data: Task[] = res.ok ? await res.json() : []
    // For "unassigned" filter client-side: tasks with no assignments
    setTasks(t === "unassigned" ? data.filter(task => task.assignments.length === 0) : data)
    setLoading(false)
  }, [])

  useEffect(() => { load(tab) }, [tab, load])

  function handleUpdated(updated: Task) {
    setTasks(ts => ts.map(t => t.id === updated.id ? updated : t))
  }
  function handleCreated(task: Task) {
    setTasks(ts => [task, ...ts])
    setShowCreate(false)
  }
  function handleDeleted(id: string) {
    setTasks(ts => ts.filter(t => t.id !== id))
  }

  // Group tasks by due date bucket
  const now = new Date()
  const todayStr = now.toDateString()
  const thisWeekEnd = new Date(now); thisWeekEnd.setDate(thisWeekEnd.getDate() + 7)

  const groups: { label: string; tasks: Task[]; cls?: string }[] = tab === "done" ? [
    { label: "Avslutade", tasks },
  ] : [
    {
      label: "Försenade",
      tasks: tasks.filter(t => isOverdue(t)),
      cls:   "text-red-600",
    },
    {
      label: "Idag",
      tasks: tasks.filter(t =>
        !isOverdue(t) && t.dueDate && new Date(t.dueDate).toDateString() === todayStr
      ),
    },
    {
      label: "Den här veckan",
      tasks: tasks.filter(t => {
        if (!t.dueDate || isOverdue(t)) return false
        const d = new Date(t.dueDate)
        return d.toDateString() !== todayStr && d <= thisWeekEnd
      }),
    },
    {
      label: "Senare",
      tasks: tasks.filter(t => {
        if (!t.dueDate || isOverdue(t)) return false
        return new Date(t.dueDate) > thisWeekEnd
      }),
    },
    {
      label: "Inget datum",
      tasks: tasks.filter(t => !t.dueDate && !isOverdue(t)),
    },
  ].filter(g => g.tasks.length > 0)

  const overdueCount = tasks.filter(isOverdue).length

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Uppgifter</h1>
          {overdueCount > 0 && (
            <p className="text-sm text-red-600 font-medium mt-0.5">{overdueCount} försenad{overdueCount !== 1 ? "e" : ""}</p>
          )}
        </div>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="text-sm font-semibold px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors"
        >
          + Ny uppgift
        </button>
      </div>

      {showCreate && (
        <div className="mb-4">
          <TaskCreateForm
            orgSlug={orgSlug}
            onCreated={handleCreated}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-colors ${
              tab === t.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-3">✓</p>
          <p className="font-semibold text-gray-900">Inga uppgifter</p>
          <p className="text-sm text-gray-400 mt-1">
            {tab === "mine" ? "Du har inga aktiva uppgifter" : "Inga uppgifter matchar filtret"}
          </p>
        </div>
      ) : (
        <div className="space-y-6 pb-24">
          {groups.map(group => (
            <div key={group.label}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${group.cls ?? "text-gray-400"}`}>
                {group.label} ({group.tasks.length})
              </p>
              <div className="space-y-1">
                {group.tasks.map(task => (
                  <GlobalTaskRow
                    key={task.id}
                    task={task}
                    onClick={() => setActiveId(task.id)}
                    onToggle={() => {
                      const next = task.status === "done" ? "open" : "done"
                      fetch(`/api/tasks/${task.id}`, {
                        method:  "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body:    JSON.stringify({ status: next }),
                      }).then(r => r.ok ? r.json() : null).then(updated => {
                        if (updated) handleUpdated(updated)
                      })
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskDrawer
        taskId={activeId}
        orgSlug={orgSlug}
        onClose={() => setActiveId(null)}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    </div>
  )
}

function GlobalTaskRow({
  task, onClick, onToggle,
}: {
  task: Task; onClick: () => void; onToggle: () => void
}) {
  const overdue = isOverdue(task)

  return (
    <div className={`flex items-center gap-3 px-4 py-3 bg-white border rounded-xl transition-all hover:border-gray-200 hover:shadow-sm ${
      overdue && task.status !== "done" ? "border-red-100 bg-red-50/30" : "border-gray-100"
    }`}>
      {/* Complete toggle */}
      <button
        onClick={e => { e.stopPropagation(); onToggle() }}
        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          task.status === "done"
            ? "bg-green-500 border-green-500 text-white"
            : "border-gray-300 hover:border-green-400"
        }`}
      >
        {task.status === "done" && <span className="text-[10px]">✓</span>}
      </button>

      {/* Priority dot */}
      <span className={`flex-shrink-0 w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority]}`}
        title={PRIORITY_LABELS[task.priority]} />

      {/* Content */}
      <button className="flex-1 min-w-0 text-left" onClick={onClick}>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium truncate ${
            task.status === "done" ? "line-through text-gray-400" : "text-gray-900"
          }`}>
            {task.title}
          </span>
          <span className={`flex-shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full ${STATUS_CLS[task.status]}`}>
            {STATUS_LABELS[task.status]}
          </span>
        </div>
        {task.entityType && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            Kopplad till {task.entityType.replace("_", " ")}
          </p>
        )}
      </button>

      {/* Assignees */}
      {task.assignments.length > 0 && (
        <div className="flex -space-x-1 flex-shrink-0">
          {task.assignments.slice(0, 3).map(a => (
            <span
              key={a.id}
              className="w-6 h-6 rounded-full bg-brand-400 text-white text-xs font-bold flex items-center justify-center border-2 border-white"
              title={a.user.fullName}
            >
              {a.user.fullName[0]}
            </span>
          ))}
          {task.assignments.length > 3 && (
            <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center border-2 border-white">
              +{task.assignments.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Due date */}
      {task.dueDate && (
        <span className={`flex-shrink-0 text-xs font-medium ${
          overdue && task.status !== "done" ? "text-red-600" : "text-gray-400"
        }`}>
          {formatDue(task.dueDate)}
        </span>
      )}

      {/* Comments */}
      {(task.commentCount ?? 0) > 0 && (
        <span className="flex-shrink-0 text-xs text-gray-400">💬 {task.commentCount}</span>
      )}

      <button onClick={onClick} className="flex-shrink-0 text-gray-300 hover:text-brand-500 transition-colors text-xs">
        →
      </button>
    </div>
  )
}

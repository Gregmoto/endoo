"use client"

import { useState, useEffect, useCallback } from "react"
import type { Task, TaskEntityType } from "./types"
import { STATUS_CLS, STATUS_LABELS, PRIORITY_DOT, isOverdue, formatDue } from "./types"
import { TaskDrawer } from "./TaskDrawer"
import { TaskCreateForm } from "./TaskCreateForm"

interface Props {
  orgSlug:    string
  entityType: TaskEntityType
  entityId:   string
  entityLabel?:string
}

export function TaskWidget({ orgSlug, entityType, entityId, entityLabel }: Props) {
  const [tasks,      setTasks]      = useState<Task[]>([])
  const [loading,    setLoading]    = useState(true)
  const [activeId,   setActiveId]   = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showDone,   setShowDone]   = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/tasks?entityType=${entityType}&entityId=${entityId}&limit=50`)
    if (res.ok) setTasks(await res.json())
    setLoading(false)
  }, [entityType, entityId])

  useEffect(() => { load() }, [load])

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

  const openTasks = tasks.filter(t => t.status !== "done" && t.status !== "cancelled")
  const doneTasks = tasks.filter(t => t.status === "done" || t.status === "cancelled")

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Uppgifter {openTasks.length > 0 && `(${openTasks.length} öppna)`}
        </span>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors"
        >
          + Lägg till
        </button>
      </div>

      {showCreate && (
        <TaskCreateForm
          orgSlug={orgSlug}
          entityType={entityType}
          entityId={entityId}
          entityLabel={entityLabel}
          onCreated={handleCreated}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {loading ? (
        <div className="text-xs text-gray-400 py-2">Laddar…</div>
      ) : tasks.length === 0 && !showCreate ? (
        <div className="text-xs text-gray-300 italic py-1">Inga uppgifter</div>
      ) : (
        <div className="space-y-1">
          {openTasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onClick={() => setActiveId(task.id)}
            />
          ))}

          {doneTasks.length > 0 && (
            <button
              onClick={() => setShowDone(v => !v)}
              className="text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors"
            >
              {showDone ? "▲" : "▼"} {doneTasks.length} avslutad{doneTasks.length !== 1 ? "e" : ""}
            </button>
          )}

          {showDone && doneTasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onClick={() => setActiveId(task.id)}
            />
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

function TaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  const overdue = isOverdue(task)

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left group border border-transparent hover:border-gray-100"
    >
      {/* Status dot */}
      <span className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
        task.status === "done" ? "bg-green-500 border-green-500" : "border-gray-300 group-hover:border-brand-400"
      }`}>
        {task.status === "done" && <span className="text-white text-[8px]">✓</span>}
      </span>

      {/* Priority */}
      <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} />

      {/* Title */}
      <span className={`flex-1 text-xs font-medium truncate ${
        task.status === "done" ? "line-through text-gray-400" : "text-gray-800"
      }`}>
        {task.title}
      </span>

      {/* Assignees */}
      {task.assignments.length > 0 && (
        <span className="flex-shrink-0 flex -space-x-1">
          {task.assignments.slice(0, 3).map(a => (
            <span
              key={a.id}
              className="w-4 h-4 rounded-full bg-brand-400 text-white text-[8px] font-bold flex items-center justify-center border border-white"
              title={a.user.fullName}
            >
              {a.user.fullName[0]}
            </span>
          ))}
        </span>
      )}

      {/* Due date */}
      {task.dueDate && task.status !== "done" && (
        <span className={`flex-shrink-0 text-[10px] font-medium ${overdue ? "text-red-500" : "text-gray-400"}`}>
          {formatDue(task.dueDate)}
        </span>
      )}

      {/* Comment count */}
      {(task.commentCount ?? 0) > 0 && (
        <span className="flex-shrink-0 text-[10px] text-gray-400">
          💬 {task.commentCount}
        </span>
      )}
    </button>
  )
}

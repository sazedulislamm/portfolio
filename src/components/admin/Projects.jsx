"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const emptyProjectForm = {
  title: "",
  description: "",
  category: "",
  responsibilities: "",
  techStack: "",
  liveDemo: "",
  github: "",
  thumb: "",
  status: "draft",
  featured: false,
  sortOrder: 0,
};

function normalizeProjectStatus(status) {
  return String(status ?? "").toLowerCase();
}

function getProjectStatusLabel(status) {
  const normalized = normalizeProjectStatus(status);
  if (normalized === "published") {
    return "Published";
  }
  if (normalized === "in-review") {
    return "In Review";
  }
  return "Draft";
}

function getProjectStatusClasses(status) {
  const normalized = normalizeProjectStatus(status);
  if (normalized === "published") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (normalized === "in-review") {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-slate-100 text-slate-600";
}

function normalizeProjectList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  const raw = String(value ?? "").trim();
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // Fall through to text parsing.
  }

  if (raw.includes("\n")) {
    return raw
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatProjectUpdated(value) {
  if (!value) {
    return "recently";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildProjectForm(project) {
  return {
    title: project?.title ?? "",
    description: project?.description ?? project?.client ?? "",
    category: project?.category ?? "",
    responsibilities: Array.isArray(project?.responsibilities)
      ? project.responsibilities.join("\n")
      : String(project?.responsibilities ?? ""),
    techStack: Array.isArray(project?.techStack)
      ? project.techStack.join("\n")
      : String(project?.techStack ?? ""),
    liveDemo: project?.liveDemo ?? "",
    github: project?.github ?? "",
    thumb: project?.thumb ?? "",
    status: normalizeProjectStatus(project?.status) || "draft",
    featured: Boolean(project?.featured),
    sortOrder: Number(project?.sortOrder ?? 0),
  };
}

export default function Projects() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState(emptyProjectForm);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadProjects() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/admin/projects", {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load projects");
        }

        if (active) {
          setData(payload);
        }
      } catch (fetchError) {
        if (active) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load projects",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      active = false;
    };
  }, []);

  const projects = useMemo(() => data?.items ?? [], [data]);
  const filteredProjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesTerm =
        !term ||
        [
          project.title,
          project.description,
          project.techStack,
          project.client,
          project.category,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesStatus =
        statusFilter === "all" ||
        normalizeProjectStatus(project.status) === statusFilter;

      return matchesTerm && matchesStatus;
    });
  }, [projects, searchTerm, statusFilter]);

  const selectedProject = useMemo(
    () =>
      projects.find((project) => String(project.id) === String(editingId)) ??
      null,
    [projects, editingId],
  );

  const selectedTechStack = useMemo(
    () => normalizeProjectList(selectedProject?.techStack),
    [selectedProject],
  );

  const selectedResponsibilities = useMemo(
    () => normalizeProjectList(selectedProject?.responsibilities),
    [selectedProject],
  );

  const modalRoot = typeof document !== "undefined" ? document.body : null;

  function showToast(message, variant = "success") {
    setToast({ id: Date.now(), message, variant });
  }

  useEffect(() => {
    if (!toast) return undefined;

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const metrics = [
    {
      label: "Total Projects",
      value: loading ? "..." : String(data?.summary?.total ?? 0),
      note: data?.source === "d1" ? "Live from D1" : "Local fallback",
    },
    {
      label: "Published",
      value: loading ? "..." : String(data?.summary?.published ?? 0),
      note: "Visible on portfolio",
    },
    {
      label: "In Review",
      value: loading ? "..." : String(data?.summary?.inReview ?? 0),
      note: "Ready for approval",
    },
    {
      label: "Drafts",
      value: loading ? "..." : String(data?.summary?.drafts ?? 0),
      note: "Needs final review",
    },
  ];

  function handleFieldChange(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setUploadingImage(true);
      setError("");

      const formData = new FormData();
      formData.append("image", file);
      formData.append("name", form.title || file.name);

      const response = await fetch("/api/admin/projects/upload-image", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to upload image");
      }

      handleFieldChange("thumb", payload.imageUrl || payload.displayUrl || "");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload image",
      );
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  }

  function openCreateProject() {
    setEditingId(null);
    setForm(emptyProjectForm);
    setEditorOpen(true);
  }

  function selectProject(project) {
    setEditingId(project.id);
  }

  function openEditProject(project) {
    setEditingId(project.id);
    setForm(buildProjectForm(project));
    setEditorOpen(true);
  }

  function handleEditorOpenChange(nextOpen) {
    setEditorOpen(nextOpen);
    if (!nextOpen) {
      setEditingId(null);
    }
  }

  async function refreshProjects() {
    const response = await fetch("/api/admin/projects", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error || "Failed to reload projects");
    }
    setData(payload);
  }

  async function handleSaveProject(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const endpoint = editingId
        ? `/api/admin/projects/${editingId}`
        : "/api/admin/projects";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save project");
      }

      setEditorOpen(false);
      setEditingId(null);
      await refreshProjects();
      showToast(
        editingId
          ? `Project updated to ${getProjectStatusLabel(form.status)}.`
          : `Project created as ${getProjectStatusLabel(form.status)}.`,
        "success",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save project",
      );
    } finally {
      setSaving(false);
    }
  }

  function openDeleteProjectModal(project) {
    setProjectToDelete(project);
    setIsDeleteModalOpen(true);
  }

  async function deleteSelectedProject(id) {
    try {
      setSaving(true);
      setError("");

      const response = await fetch(`/api/admin/projects/${id}`, {
        method: "DELETE",
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to delete project");
      }

      if (String(editingId) === String(id)) {
        setEditorOpen(false);
        setEditingId(null);
      }

      await refreshProjects();
      showToast("Project deleted.", "success");
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete project",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      {toast ? (
        <div className="fixed left-1/2 top-5 z-50 w-[min(92vw,28rem)] -translate-x-1/2">
          <div
            className={`rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur ${
              toast.variant === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : toast.variant === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-800"
                  : "border-slate-200 bg-white text-slate-800"
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-lg">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-300">
          Portfolio Content Studio
        </p>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold">Projects Management</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-200">
              Organize case studies, monitor publication status, and keep your
              portfolio content polished.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15">
              Preview Portfolio
            </button>
            <button
              type="button"
              onClick={openCreateProject}
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
            >
              Add Project
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {metric.value}
            </p>
            <p className="mt-1 text-xs text-slate-400">{metric.note}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Project Library
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Browse your featured work, publication state, and progress in
                one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Search projects"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="min-w-[220px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="in-review">In Review</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-[1.6fr_1fr_0.9fr_0.9fr_0.8fr_0.8fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <span>Project</span>
              <span>Category</span>
              <span>Status</span>
              <span>Progress</span>
              <span>Updated</span>
              <span>Actions</span>
            </div>

            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="px-4 py-6 text-sm text-slate-500">
                  Loading projects...
                </div>
              ) : filteredProjects.length > 0 ? (
                filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectProject(project)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectProject(project);
                      }
                    }}
                    className="grid cursor-pointer grid-cols-[1.6fr_1fr_0.9fr_0.9fr_0.8fr_0.8fr] gap-4 px-4 py-4 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {project.title}
                      </p>
                      {/* <p className="mt-1 text-xs text-slate-500">{project.description || project.client}</p> */}
                    </div>

                    <div className="flex items-center text-slate-600">
                      {project.category || "Web"}
                    </div>

                    <div className="flex items-center">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getProjectStatusClasses(project.status)}`}
                      >
                        {getProjectStatusLabel(project.status)}
                      </span>
                    </div>

                    <div className="flex items-center">
                      <div className="w-full">
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-slate-900"
                            style={{ width: `${project.progress ?? 0}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {project.progress ?? 0}% complete
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center text-slate-500">
                      {project.updated || "recently"}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditProject(project);
                        }}
                        className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDeleteProjectModal(project);
                        }}
                        disabled={saving}
                        className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-sm text-slate-500">
                  No projects found yet.
                </div>
              )}
            </div>
          </div>
        </article>

        <aside className="space-y-6">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Selected Project
            </h3>
            {selectedProject ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <div className="relative h-40 w-full overflow-hidden border-b border-slate-200 bg-slate-100">
                  {selectedProject?.thumb ? (
                    <Image
                      src={selectedProject.thumb}
                      alt={selectedProject.title}
                      fill
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                      No Thumbnail
                    </div>
                  )}
                </div>

                <div className="space-y-4 p-4">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {selectedProject.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedProject.description || "No description provided."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getProjectStatusClasses(selectedProject.status)}`}
                    >
                      {getProjectStatusLabel(selectedProject.status)}
                    </span>
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                      {selectedProject.category || "Web"}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 border border-slate-200">
                      {selectedProject.featured ? "Featured" : "Not Featured"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Sort Order</p>
                      <p className="mt-1 font-medium text-slate-800">{selectedProject.sortOrder ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Updated</p>
                      <p className="mt-1 font-medium text-slate-800">{formatProjectUpdated(selectedProject.updated)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Responsibilities</p>
                      <p className="mt-1 font-medium text-slate-800">{selectedResponsibilities.length}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Tech Items</p>
                      <p className="mt-1 font-medium text-slate-800">{selectedTechStack.length}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Tech Stack</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedTechStack.length > 0 ? (
                        selectedTechStack.map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                          >
                            {item}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">No tech stack added.</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Key Responsibilities</p>
                    {selectedResponsibilities.length > 0 ? (
                      <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                        {selectedResponsibilities.slice(0, 3).map((item, index) => (
                          <li key={`${item}-${index}`} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400" />
                            <span>{item}</span>
                          </li>
                        ))}
                        {selectedResponsibilities.length > 3 ? (
                          <li className="text-xs text-slate-500">
                            +{selectedResponsibilities.length - 3} more in editor
                          </li>
                        ) : null}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">No responsibilities added.</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={selectedProject.liveDemo || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`rounded-lg px-3 py-2 text-center text-xs font-medium transition ${selectedProject.liveDemo ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100" : "pointer-events-none border border-slate-100 bg-slate-100 text-slate-400"}`}
                    >
                      Live Demo
                    </a>
                    <a
                      href={selectedProject.github || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`rounded-lg px-3 py-2 text-center text-xs font-medium transition ${selectedProject.github ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100" : "pointer-events-none border border-slate-100 bg-slate-100 text-slate-400"}`}
                    >
                      GitHub
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Pick a project row to view complete details here.
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  selectedProject
                    ? openEditProject(selectedProject)
                    : openCreateProject()
                }
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {selectedProject ? "Edit Project" : "Create Project"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedProject) {
                    openDeleteProjectModal(selectedProject);
                  }
                }}
                disabled={!selectedProject}
                className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Delete Project
              </button>
            </div>
          </article>
        </aside>
      </div>

      {modalRoot && isDeleteModalOpen && projectToDelete
        ? createPortal(
            <div className="fixed inset-0 z-50 flex h-dvh w-dvw items-center justify-center overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-project-modal-title"
                className="my-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-rose-400">
                      Delete confirmation
                    </p>
                    <h3
                      id="delete-project-modal-title"
                      className="mt-2 text-2xl font-semibold text-slate-900"
                    >
                      Delete this project?
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      This will permanently remove the project from the portfolio.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-white"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">
                    {projectToDelete.title || `ID: ${projectToDelete.id}`}
                  </p>
                  {projectToDelete.category ? (
                    <p className="mt-1 text-sm text-slate-500">
                      {projectToDelete.category}
                    </p>
                  ) : null}
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSelectedProject(projectToDelete.id)}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
                  >
                    Delete Project
                  </button>
                </div>
              </div>
            </div>,
            modalRoot,
          )
        : null}

      <Sheet open={editorOpen} onOpenChange={handleEditorOpenChange}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto bg-white p-0 text-slate-900 sm:max-w-2xl"
        >
          <div className="flex min-h-full flex-col">
            <SheetHeader className="border-b border-slate-200 px-6 py-6 text-left">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                {editingId ? "Edit Project" : "New Project"}
              </p>
              <SheetTitle className="text-2xl font-semibold text-slate-900">
                {editingId ? "Update project details" : "Create a new project"}
              </SheetTitle>
              <SheetDescription className="max-w-xl text-sm text-slate-500">
                Keep the content clean and publication-ready. This popup saves
                the project into the admin data layer.
              </SheetDescription>
            </SheetHeader>

            <form
              onSubmit={handleSaveProject}
              className="flex flex-1 flex-col gap-6 px-6 py-6"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-600 md:col-span-2">
                  <span>Title</span>
                  <input
                    value={form.title}
                    onChange={(e) => handleFieldChange("title", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:bg-white"
                    placeholder="Project title"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-600 md:col-span-2">
                  <span>Description</span>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      handleFieldChange("description", e.target.value)
                    }
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:bg-white"
                    placeholder="Short summary of the project"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-600 md:col-span-2">
                  <span>Responsibilities</span>
                  <textarea
                    value={form.responsibilities}
                    onChange={(e) =>
                      handleFieldChange("responsibilities", e.target.value)
                    }
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:bg-white"
                    placeholder="One responsibility per line"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span>Category</span>
                  <input
                    value={form.category}
                    onChange={(e) =>
                      handleFieldChange("category", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:bg-white"
                    placeholder="Backend, Frontend, Full Stack"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span>Tech Stack</span>
                  <input
                    value={form.techStack}
                    onChange={(e) =>
                      handleFieldChange("techStack", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:bg-white"
                    placeholder="Node.js, NestJS, PostgreSQL"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span>Status</span>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      handleFieldChange("status", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:bg-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="in-review">In Review</option>
                    <option value="published">Published</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span>Live URL</span>
                  <input
                    value={form.liveDemo}
                    onChange={(e) =>
                      handleFieldChange("liveDemo", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:bg-white"
                    placeholder="https://project-demo.com"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span>GitHub</span>
                  <input
                    value={form.github}
                    onChange={(e) =>
                      handleFieldChange("github", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:bg-white"
                    placeholder="https://github.com/..."
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-600 md:col-span-2">
                  <span>Thumbnail (imgBB)</span>
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:bg-slate-50"
                    />
                    <input
                      value={form.thumb}
                      onChange={(e) =>
                        handleFieldChange("thumb", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-300"
                      placeholder="imgBB image URL"
                    />
                    <p className="text-xs text-slate-500">
                      {uploadingImage
                        ? "Uploading to imgBB..."
                        : "Upload an image or paste the imgBB URL directly."}
                    </p>
                    {form.thumb ? (
                      <div className="relative h-40 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <Image
                          src={form.thumb}
                          alt="Project preview"
                          fill
                          unoptimized
                          className="h-40 w-full object-cover"
                        />
                      </div>
                    ) : null}
                  </div>
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span>Sort Order</span>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) =>
                      handleFieldChange("sortOrder", Number(e.target.value))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:bg-white"
                  />
                </label>
                <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 md:col-span-2">
                  <span>Featured project</span>
                  <input
                    type="checkbox"
                    checked={Boolean(form.featured)}
                    onChange={(e) =>
                      handleFieldChange("featured", e.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </label>
              </div>

              <div className="mt-auto flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => handleEditorOpenChange(false)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Project"
                      : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import JoditEditor from "jodit-react";

const emptyPost = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  tags: "",
  thumb: "",
  status: "draft",
  featured: false,
};

function normalizeTags(value) {
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatDate(value) {
  if (!value) return "recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getStatusTone(status) {
  const normalized = String(status || "draft").toLowerCase();
  if (normalized === "published") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (normalized === "draft") return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function getEmptyCardImage(title) {
  const safeTitle = String(title || "Blog post").trim();
  const firstWord = safeTitle.split(" ").slice(0, 2).join(" ");
  return `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80&${encodeURIComponent(firstWord)}`;
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function RichTextEditor({ label, value, onChange, placeholder, minHeight = 180 }) {
  const editorRef = useRef(null);

  const config = useMemo(
    () => ({
      placeholder,
      readonly: false,
      autofocus: false,
      toolbarAdaptive: false,
      toolbarSticky: true,
      toolbar: true,
      showXPathInStatusbar: false,
      showPoweredByJodit: false,
      enter: "P",
      defaultMode: "wysiwyg",
      minHeight,
      buttons: [
        "undo",
        "redo",
        "|",
        "font",
        "fontsize",
        "brush",
        "paragraph",
        "|",
        "bold",
        "italic",
        "underline",
        "strikethrough",
        "superscript",
        "subscript",
        "|",
        "ul",
        "ol",
        "outdent",
        "indent",
        "|",
        "align",
        "|",
        "link",
        "image",
        "table",
        "emoji",
        "hr",
        "|",
        "source",
        "fullsize",
      ],
      buttonsXS: [
        "bold",
        "italic",
        "underline",
        "|",
        "ul",
        "ol",
        "|",
        "link",
        "image",
      ],
      buttonsSM: [
        "undo",
        "redo",
        "|",
        "font",
        "fontsize",
        "|",
        "bold",
        "italic",
        "underline",
        "|",
        "ul",
        "ol",
        "|",
        "link",
        "image",
        "table",
      ],
      buttonsMD: [
        "undo",
        "redo",
        "|",
        "font",
        "fontsize",
        "brush",
        "paragraph",
        "|",
        "bold",
        "italic",
        "underline",
        "strikethrough",
        "|",
        "ul",
        "ol",
        "|",
        "link",
        "image",
        "table",
      ],
    }),
    [minHeight, placeholder]
  );

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <JoditEditor
          ref={editorRef}
          value={value || ""}
          config={config}
          onBlur={(nextValue) => onChange(nextValue)}
          onChange={(nextValue) => onChange(nextValue)}
        />
      </div>
      {!stripHtml(value) ? <p className="text-xs text-slate-400">{placeholder}</p> : null}
    </div>
  );
}

export default function Blog() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState(emptyPost);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const imageInputRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/admin/blog", { cache: "no-store" });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.error || "Failed to load posts");
        if (active) {
          setData(payload);
          setLastRefreshedAt(new Date().toISOString());
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const posts = useMemo(() => data?.items ?? [], [data]);
  const summary = data?.summary ?? { total: 0, published: 0, drafts: 0 };

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function populateFromPost(post) {
    return {
      title: post.title || "",
      slug: post.slug || "",
      excerpt: post.excerpt || "",
      body: post.body || "",
      tags: Array.isArray(post.tags) ? post.tags.join(", ") : String(post.tags || ""),
      thumb: post.thumb || "",
      status: post.status || "draft",
      featured: Boolean(post.featured),
    };
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyPost);
    setEditorOpen(true);
  }

  function openEdit(post) {
    setEditingId(post.id);
    setForm(populateFromPost(post));
    setEditorOpen(true);
  }

  async function refresh() {
    try {
      setRefreshing(true);
      setError("");
      const res = await fetch("/api/admin/blog", { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Failed to reload posts");
      setData(payload);
      setLastRefreshedAt(new Date().toISOString());
    } finally {
      setRefreshing(false);
    }
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

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

      updateField("thumb", payload.imageUrl || payload.displayUrl || "");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : String(uploadError));
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  }

  async function save(e) {
    e?.preventDefault?.();

    try {
      setSaving(true);
      setError("");

      const endpoint = editingId ? `/api/admin/blog/${editingId}` : "/api/admin/blog";
      const method = editingId ? "PATCH" : "POST";
      const payload = {
        ...form,
        tags: normalizeTags(form.tags),
      };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseBody = await res.json();
      if (!res.ok) throw new Error(responseBody?.error || "Failed to save post");

      setEditorOpen(false);
      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this post?")) return;
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Failed to delete");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="relative isolate bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.95),_rgba(2,6,23,0.98))] px-6 py-7 text-white sm:px-8">
          <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-300">Content Studio</p>
              <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Blog management</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Create polished posts with featured images, structured tags, and publication controls.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center sm:min-w-[320px]">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-2xl font-semibold">{loading ? "…" : summary.total}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-300">Total</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-2xl font-semibold">{loading ? "…" : summary.published}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-300">Published</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-2xl font-semibold">{loading ? "…" : summary.drafts}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-300">Drafts</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 sm:px-8 border-t border-slate-200 bg-slate-50/80">
          <p className="text-sm text-slate-600">Professional cards, structured metadata, and imgBB uploads for featured images.</p>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={openCreate} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
              New Post
            </button>
            <button onClick={refresh} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            {lastRefreshedAt ? (
              <span className="text-xs text-slate-500">
                Updated {formatDate(lastRefreshedAt)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <article key={index} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
              <div className="h-44 animate-pulse bg-slate-100" />
              <div className="space-y-3 p-5">
                <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                <div className="h-6 w-3/4 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
              </div>
            </article>
          ))
        ) : posts.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-8 text-slate-500">
            No blog posts yet. Create the first article to start building the blog.
          </div>
        ) : (
          posts.map((post) => {
            const tags = Array.isArray(post.tags) ? post.tags : normalizeTags(post.tags);
            const heroImage = post.thumb || getEmptyCardImage(post.title);
            const description = stripHtml(post.excerpt) || stripHtml(post.body).slice(0, 140) || "A blog post draft ready for publishing.";

            return (
              <article key={post.id} className="group overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="relative h-52 overflow-hidden bg-slate-100">
                  <Image
                    src={heroImage}
                    alt={post.title}
                    fill
                    unoptimized
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
                  <div className="absolute left-4 top-4 flex gap-2">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${getStatusTone(post.status)}`}>
                      {String(post.status || "draft").replace(/-/g, " ")}
                    </span>
                    {post.featured ? (
                      <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-800 ring-1 ring-white/60">
                        Featured
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span>{formatDate(post.updatedAt || post.createdAt)}</span>
                      <span>{tags.length} tag{tags.length === 1 ? "" : "s"}</span>
                    </div>
                    <h3 className="line-clamp-2 text-xl font-semibold tracking-tight text-slate-950">{post.title}</h3>
                    <p className="line-clamp-3 text-sm leading-6 text-slate-600">{description}</p>
                  </div>

                  {tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
                    <div className="text-xs text-slate-500">
                      <div className="font-medium text-slate-700">{post.slug || "untitled-post"}</div>
                      <div className="mt-1">Updated {formatDate(post.updatedAt || post.createdAt)}</div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(post)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(post.id)}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm sm:px-6 lg:px-8">
          <button
            type="button"
            aria-label="Close blog editor"
            className="absolute inset-0"
            onClick={() => {
              setEditorOpen(false);
              setEditingId(null);
            }}
          />

          <form onSubmit={save} className="relative z-10 mx-auto mt-4 w-full max-w-6xl overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_28px_100px_rgba(15,23,42,0.28)]">
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 to-slate-800 px-6 py-5 text-white sm:px-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Blog editor</p>
                  <h3 className="mt-1 text-2xl font-semibold">{editingId ? "Edit blog post" : "Create blog post"}</h3>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300">
                    Write a polished article with image, tags, SEO-friendly slug and publication state.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditorOpen(false);
                      setEditingId(null);
                    }}
                    className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving ? "Saving..." : editingId ? "Update post" : "Create post"}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-6 p-6 sm:p-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-600 sm:col-span-2">
                    <span className="font-medium text-slate-700">Title</span>
                    <input
                      value={form.title}
                      onChange={(e) => updateField("title", e.target.value)}
                      placeholder="How to build a scalable admin dashboard"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-600">
                    <span className="font-medium text-slate-700">Slug</span>
                    <input
                      value={form.slug}
                      onChange={(e) => updateField("slug", e.target.value)}
                      placeholder="scalable-admin-dashboard"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-600">
                    <span className="font-medium text-slate-700">Status</span>
                    <select
                      value={form.status}
                      onChange={(e) => updateField("status", e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </label>

                  <div className="sm:col-span-2">
                    <RichTextEditor
                      label="Short description"
                      value={form.excerpt}
                      onChange={(value) => updateField("excerpt", value)}
                      placeholder="Write a concise summary that will appear on the blog card and preview snippets."
                      minHeight={140}
                      compact
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <RichTextEditor
                      label="Full article"
                      value={form.body}
                      onChange={(value) => updateField("body", value)}
                      placeholder="Compose the full article content here. Use the toolbar to format text."
                      minHeight={320}
                    />
                  </div>
                </div>
              </div>

              <aside className="border-t border-slate-200 bg-slate-50/80 p-6 sm:p-8 lg:border-l lg:border-t-0">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Cover image</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Upload a featured image to make the card look more editorial and professional.
                    </p>

                    <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                      <div className="relative aspect-[16/10] bg-slate-100">
                        {form.thumb ? (
                          <Image src={form.thumb} alt={form.title || "Blog cover"} fill unoptimized className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.92),_rgba(2,6,23,0.98))] px-8 text-center text-white">
                            <div>
                              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">No image selected</p>
                              <p className="mt-2 text-lg font-semibold">Upload a professional cover image</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3 p-4">
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {uploadingImage ? "Uploading to imgBB..." : form.thumb ? "Replace cover image" : "Upload cover image"}
                        </button>
                        <label className="space-y-2 text-sm text-slate-600">
                          <span className="font-medium text-slate-700">Image URL</span>
                          <input
                            value={form.thumb}
                            onChange={(e) => updateField("thumb", e.target.value)}
                            placeholder="https://..."
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <label className="space-y-2 text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Tags</span>
                      <input
                        value={form.tags}
                        onChange={(e) => updateField("tags", e.target.value)}
                        placeholder="design, nextjs, performance"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                      />
                    </label>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <label className="flex items-center justify-between gap-4 text-sm text-slate-700">
                        <span className="font-medium">Featured post</span>
                        <input
                          type="checkbox"
                          checked={form.featured}
                          onChange={(e) => updateField("featured", e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </label>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Feature this post to highlight it in the blog grid and any future public blog section.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-700">Quick preview</p>
                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                        <div className="font-medium text-slate-900">{form.title || "Untitled post"}</div>
                        <div>{form.excerpt || "A short description will appear here."}</div>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {normalizeTags(form.tags).length > 0 ? normalizeTags(form.tags).slice(0, 4).map((tag) => (
                            <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">#{tag}</span>
                          )) : (
                            <span className="text-xs text-slate-400">Add tags to improve discoverability</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

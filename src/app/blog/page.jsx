import Image from 'next/image';
import Link from 'next/link';
import { getPublicPosts } from '@/lib/cloudflare-d1';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sazedulislam.me';

export async function generateMetadata() {
  const description = 'Notes, tutorials, and engineering updates by Sazedul Islam. Browse featured and latest posts.';
  return {
    title: 'Blog',
    description,
    openGraph: {
      title: 'Blog — Sazedul Islam',
      description,
      url: `${SITE_URL}/blog`,
      siteName: 'Sazedul Islam',
    },
  };
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(value) {
  if (!value) return 'recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getReadingTime(value) {
  const words = stripHtml(value).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export default async function BlogPage() {
  const posts = await getPublicPosts();
  const items = posts.items ?? [];

  return (
    <section className="relative min-h-[85vh] overflow-hidden bg-gradient-to-b from-[#071426] via-[#061325] to-[#08121a] py-12 lg:py-16">
      <div className="pointer-events-none absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-40 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />

      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-accent/85">Blog</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white md:text-5xl">Notes, tutorials, and engineering updates</h1>
            <p className="mt-4 text-sm leading-7 text-white/65 md:text-base">
              Browse the latest articles, tutorials, and project notes. Featured posts appear first so the most important updates are easy to find.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/70 backdrop-blur-sm">
            {items.length} published post{items.length === 1 ? '' : 's'}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#0c1826]/75 p-8 text-white/70 backdrop-blur-sm">
            No published blog posts yet.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {items.map((post) => {
              const tags = Array.isArray(post.tags) ? post.tags : [];
              const preview = stripHtml(post.excerpt || post.body).slice(0, 160) || 'A new article from the Sazedul Islam blog.';
              const cover = post.thumb || '';

              return (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug || slugify(post.title)}`}
                  className="group overflow-hidden rounded-[28px] border border-white/10 bg-[#0c1826]/80 shadow-[0_14px_40px_rgba(2,6,23,0.45)] backdrop-blur-sm transition hover:-translate-y-1 hover:border-accent/25"
                >
                  <div className="relative h-56 overflow-hidden bg-slate-900">
                    {cover ? (
                      <Image
                        src={cover}
                        alt={post.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        unoptimized
                        className="object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-xs uppercase tracking-[0.24em] text-white/35">
                        No Cover Image
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#08131e]/85 via-transparent to-transparent" />
                    <div className="absolute left-4 top-4 flex gap-2">
                      {post.featured ? (
                        <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                          Featured
                        </span>
                      ) : null}
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85">
                        {getReadingTime(post.body || post.excerpt)} min read
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="flex items-center justify-between gap-3 text-xs text-white/45">
                      <span>{formatDate(post.updatedAt || post.createdAt)}</span>
                      <span>{tags.length} tag{tags.length === 1 ? '' : 's'}</span>
                    </div>

                    <h2 className="line-clamp-2 text-2xl font-semibold tracking-tight text-white">{post.title}</h2>
                    <p className="line-clamp-3 text-sm leading-7 text-white/65">{preview}</p>

                    {tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="pt-1 text-sm font-medium text-accent">Read article →</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
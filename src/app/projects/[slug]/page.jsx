import Image from 'next/image';
import Link from 'next/link';
import { getPublicProjects } from '@/lib/cloudflare-d1';
import { notFound } from 'next/navigation';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sazedulislam.me';

export async function generateMetadata({ params }) {
  const { slug } = params;
  const projects = await getPublicProjects();
  const item = (projects.items ?? []).find((it) => {
    const s = String(it.title || it.name || it.num || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return s === slug;
  });

  if (!item) return { title: 'Project' };

  const description = item.description || `${item.title} — project by Sazedul Islam.`;
  return {
    title: item.title,
    description,
    alternates: { canonical: `${SITE_URL}/projects/${slug}` },
    openGraph: { title: item.title, description, url: `${SITE_URL}/projects/${slug}`, images: item.thumb ? [{ url: item.thumb }] : undefined },
  };
}

const slugify = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export default async function ProjectDetail({ params }) {
  const { slug } = await params;

  const projects = await getPublicProjects();
  const item = (projects.items ?? []).find((it) => slugify(it.title || it.name || it.num) === slug);
  if (!item) return notFound();

  const title = item.title || item.name || '';
  const liveUrl = item.liveDemo || '';
  const techItems = (item.techStack || []).map((s) =>
    typeof s === 'string' ? s : s?.name
  ).filter(Boolean);
  const responsibilities = item.responsibilities || [];

  return (
    <section className="relative min-h-[85vh] overflow-hidden bg-gradient-to-b from-[#071426] via-[#061325] to-[#08121a] py-12 lg:py-16">
      <div className="pointer-events-none absolute -top-16 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />

      <div className="container mx-auto px-4">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          'name': title,
          'description': item.description || '',
          'url': `${SITE_URL}/projects/${slugify(title)}`,
          'image': item.thumb || undefined,
        }) }} />
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm text-accent transition-colors hover:bg-white/10"
          >
            <span>←</span>
            <span>Back to projects</span>
          </Link>

          <span className="rounded-full border border-accent/35 bg-accent/10 px-3 py-1 text-xs font-semibold tracking-wide text-accent">
            #{item.num}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#0c1826]/75 p-5 backdrop-blur-sm shadow-[0_14px_40px_rgba(2,6,23,0.45)]">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-accent">
                  {item.category}
                </span>
                <span className="text-sm text-white/50">Featured Project</span>
              </div>

              <h1 className="text-3xl font-bold leading-tight md:text-4xl">{title}</h1>
              <p className="mt-4 text-white/72 leading-relaxed">
                {item.description || 'No description provided for this project.'}
              </p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c1826]/75 shadow-[0_14px_40px_rgba(2,6,23,0.45)]">
              <div className="relative h-64 w-full md:h-96 lg:h-[520px]">
                {item.thumb ? (
                  <Image src={item.thumb} alt={title} fill sizes="(max-width: 768px) 100vw, 75vw" unoptimized className="object-cover" priority />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-sm uppercase tracking-[0.24em] text-white/35">
                    No Preview Available
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#08131e]/70 via-transparent to-transparent" />
                {/* <div className="absolute left-4 bottom-4 max-w-[80%] rounded-xl border border-white/10 bg-[#06111c]/80 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.22em] text-accent/85">Visual Preview</p>
                  <p className="mt-1 text-sm text-white/80">
                    Clean, functional interface snapshot of the delivered experience.
                  </p>
                </div> */}
              </div>
            </div>

            {responsibilities.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#0c1826]/75 p-6 backdrop-blur-sm shadow-[0_14px_40px_rgba(2,6,23,0.45)]">
                <h3 className="mb-4 text-xl font-semibold">Key Responsibilities</h3>
                <ul className="space-y-3 text-white/75">
                  {responsibilities.map((r, i) => (
                    <li key={i} className="flex items-start gap-3 leading-relaxed">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 h-fit rounded-2xl border border-white/10 bg-[#0c1826]/75 p-5 backdrop-blur-sm shadow-[0_14px_40px_rgba(2,6,23,0.45)]">
            <div className="rounded-xl border border-white/8 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-accent/85">Project Snapshot</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/55">Category</span>
                  <span className="font-medium text-white/90">{item.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/55">Ref</span>
                  <span className="font-medium text-white/90">#{item.num}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/55">Stack Items</span>
                  <span className="font-medium text-white/90">{techItems.length}</span>
                </div>
              </div>
            </div>

            {techItems.length > 0 && (
              <div className="mt-5">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-accent/90">Tech Stack</h4>
                <div className="flex flex-wrap gap-2">
                  {techItems.map((s, i) => (
                    <span key={i} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/85">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              {liveUrl && (
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={liveUrl}
                  className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-accent to-[#43c6ad] px-4 py-2.5 font-semibold text-[#06111c] transition-opacity hover:opacity-90"
                >
                  Live Demo
                </a>
              )}
              {item.github && (
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={item.github}
                  className="inline-flex items-center justify-center rounded-lg border border-white/12 bg-white/5 px-4 py-2.5 font-medium text-white/90 transition-colors hover:bg-white/10"
                >
                  View GitHub
                </a>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

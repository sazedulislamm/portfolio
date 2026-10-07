import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicPosts } from '@/lib/cloudflare-d1';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sazedulislam.me';

export async function generateMetadata({ params }) {
  const { slug } = params;
  const posts = await getPublicPosts();
  const item = (posts.items ?? []).find((post) => (post.slug || String(post.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) === slug);

  if (!item) {
    return { title: 'Post not found' };
  }

  const description = item.excerpt || stripHtml(item.body || '').slice(0, 160) || 'Article by Sazedul Islam.';
  const canonical = `${SITE_URL}/blog/${item.slug || String(item.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

  return {
    title: item.title,
    description,
    alternates: { canonical },
    openGraph: {
      title: item.title,
      description,
      url: canonical,
      type: 'article',
      images: item.thumb ? [{ url: item.thumb, alt: item.title }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: item.title,
      description,
      images: item.thumb ? [item.thumb] : undefined,
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
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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

function isHtmlContent(value) {
  return /<\s*[a-z][\s\S]*>/i.test(String(value || ''));
}

function isImageUrl(value) {
  const raw = String(value || '').trim();
  return /^https?:\/\/.+/i.test(raw) && /\.(png|jpe?g|gif|webp|avif)(\?.*)?$/i.test(raw);
}

function linkifyText(value) {
  const text = String(value || '');
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlPattern);

  return parts.map((part, index) => {
    if (/^https?:\/\/[^\s]+$/i.test(part)) {
      return (
        <a
          key={`${part}-${index}`}
          href={part}
          target="_blank"
          rel="noreferrer noopener"
          className="break-all text-accent underline decoration-accent/60 underline-offset-4"
        >
          {part}
        </a>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function renderPlainBlocks(content) {
  const lines = String(content || '')
    .replace(/\r\n/g, '\n')
    .split('\n');

  const blocks = [];
  let listType = null;
  let listItems = [];

  const flushList = () => {
    if (!listType || listItems.length === 0) {
      listType = null;
      listItems = [];
      return;
    }

    const ListTag = listType === 'ol' ? 'ol' : 'ul';
    blocks.push(
      <ListTag key={`list-${blocks.length}`} className="ml-6 space-y-2 py-2 text-white/75">
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`} className="leading-7">
            {linkifyText(item)}
          </li>
        ))}
      </ListTag>
    );

    listType = null;
    listItems = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      blocks.push(<div key={`spacer-${index}`} className="h-4" />);
      return;
    }

    const orderedMatch = trimmed.match(/^\d+[.)]\s+(.*)$/);
    const unorderedMatch = trimmed.match(/^(?:[-*•])\s+(.*)$/);

    if (orderedMatch || unorderedMatch) {
      const nextType = orderedMatch ? 'ol' : 'ul';
      if (listType && listType !== nextType) {
        flushList();
      }
      listType = nextType;
      listItems.push((orderedMatch || unorderedMatch)[1]);
      return;
    }

    flushList();

    if (isImageUrl(trimmed)) {
      blocks.push(
        <div key={`image-${index}`} className="my-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
          <Image src={trimmed} alt="Blog content image" width={1600} height={900} unoptimized className="h-auto w-full object-cover" />
        </div>
      );
      return;
    }

    blocks.push(
      <p key={`para-${index}`} className="leading-8 text-white/75">
        {linkifyText(trimmed)}
      </p>
    );
  });

  flushList();
  return blocks;
}

function RichBody({ content, className = '' }) {
  const raw = String(content || '');

  if (!raw.trim()) {
    return <p className={className}>No article content was added yet.</p>;
  }

  if (isHtmlContent(raw)) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: raw }} />;
  }

  return <div className={className}>{renderPlainBlocks(raw)}</div>;
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const posts = await getPublicPosts();
  const item = (posts.items ?? []).find((post) => (post.slug || slugify(post.title)) === slug);

  if (!item) {
    return notFound();
  }

  const tags = Array.isArray(item.tags) ? item.tags : [];
  const cover = item.thumb || '';

  return (
    <article className="relative min-h-[85vh] overflow-hidden bg-gradient-to-b from-[#071426] via-[#061325] to-[#08121a] py-12 lg:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            'headline': item.title,
            'description': item.excerpt || stripHtml(item.body || '').slice(0, 160),
            'image': item.thumb || undefined,
            'author': { '@type': 'Person', 'name': 'Sazedul Islam' },
            'url': `${SITE_URL}/blog/${item.slug || slugify(item.title)}`,
            'datePublished': item.createdAt,
            'dateModified': item.updatedAt || item.createdAt,
          }),
        }}
      />
      <div className="pointer-events-none absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
      <div className="container mx-auto px-4">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link href="/blog" className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm text-accent transition hover:bg-white/10">
            <span>←</span>
            <span>Back to blog</span>
          </Link>

          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            {getReadingTime(item.body || item.excerpt)} min read
          </span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            <header className="rounded-[28px] border border-white/10 bg-[#0c1826]/80 p-6 shadow-[0_14px_40px_rgba(2,6,23,0.45)] backdrop-blur-sm sm:p-8">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                {item.featured ? (
                  <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                    Featured
                  </span>
                ) : null}
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  {formatDate(item.createdAt || item.updatedAt)}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  {tags.length} tag{tags.length === 1 ? '' : 's'}
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">{item.title}</h1>
              <RichBody
                content={item.excerpt || 'Published from the admin dashboard.'}
                className="mt-4 max-w-3xl text-base leading-8 text-white/65 md:text-lg [&_strong]:text-white [&_b]:text-white [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_p]:mb-3 [&_p]:text-white/65"
              />
            </header>

            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0c1826]/80 shadow-[0_14px_40px_rgba(2,6,23,0.45)]">
              <div className="relative aspect-[16/10] w-full bg-slate-900 sm:aspect-[16/9] lg:aspect-[16/8]">
                {cover ? (
                  <Image src={cover} alt={item.title} fill sizes="(max-width: 1024px) 100vw, 70vw" unoptimized className="object-cover" priority />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-xs uppercase tracking-[0.24em] text-white/35">
                    No Cover Image
                  </div>
                )}
              </div>
            </div>

            <section className="rounded-[28px] border border-white/10 bg-[#0c1826]/80 p-6 shadow-[0_14px_40px_rgba(2,6,23,0.45)] backdrop-blur-sm sm:p-8">
              <h2 className="text-xl font-semibold text-white">Full Article</h2>
              <RichBody
                content={item.body || item.excerpt || 'No article content was added yet.'}
                className="mt-5 space-y-4 text-white/70 [&_h1]:mt-8 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-white [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-white [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-white [&_strong]:text-white [&_b]:text-white [&_em]:text-white/90 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_ul]:ml-6 [&_ul]:list-disc [&_ol]:ml-6 [&_ol]:list-decimal [&_li]:my-2 [&_img]:my-4 [&_img]:rounded-2xl [&_img]:border [&_img]:border-white/10"
              />
            </section>
          </div>

          <aside className="h-fit space-y-6 lg:sticky lg:top-24">
            <div className="rounded-[28px] border border-white/10 bg-[#0c1826]/80 p-6 shadow-[0_14px_40px_rgba(2,6,23,0.45)] backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-accent/85">Article details</p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3 text-white/70">
                  <span>Published</span>
                  <span className="font-medium text-white">{formatDate(item.createdAt || item.updatedAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3 text-white/70">
                  <span>Slug</span>
                  <span className="font-medium text-white">{item.slug || slugify(item.title)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3 text-white/70">
                  <span>Reading time</span>
                  <span className="font-medium text-white">{getReadingTime(item.body || item.excerpt)} min</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-white/70">
                  <span>Tags</span>
                  <span className="font-medium text-white">{tags.length}</span>
                </div>
              </div>
            </div>

            {tags.length > 0 ? (
              <div className="rounded-[28px] border border-white/10 bg-[#0c1826]/80 p-6 shadow-[0_14px_40px_rgba(2,6,23,0.45)] backdrop-blur-sm">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-accent/90">Tags</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </article>
  );
}
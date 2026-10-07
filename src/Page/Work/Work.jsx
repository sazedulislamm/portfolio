"use client";

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BsArrowUpRight } from 'react-icons/bs';
import { projects } from '../../data/projectsData.js';

const ITEMS_PER_PAGE = 9; // 3 per row x 3 rows

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const Work = ({ initialProjects = [] }) => {
  const projectItems = useMemo(
    () => (initialProjects.length > 0 ? initialProjects : projects?.items ?? []),
    [initialProjects]
  );
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(projectItems.length / ITEMS_PER_PAGE));

  const paged = projectItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06, delayChildren: 0.06 } },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
  };

  return (
    <section className="relative min-h-[80vh] py-14 lg:py-16 bg-gradient-to-b from-[#071426] via-[#061325] to-[#08121a] overflow-hidden">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-10 max-w-4xl text-center">
          <h2 className="text-4xl font-bold my-3">
            My <span className="text-accent">Projects</span>
          </h2>
          <p className="mx-auto max-w-3xl text-white/70 leading-relaxed">
            Here are some of the key projects I have worked on, showcasing backend and full-stack expertise, API design, real-time systems, and production-ready engineering.
          </p>
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {paged.map((item, idx) => {
            const title = item.title || item.name || '';
            const slug = item.slug || slugify(title || item.num || `project-${(page - 1) * ITEMS_PER_PAGE + idx}`);
            return (
              <Link key={slug} href={`/projects/${slug}`}>
                <motion.div
                  variants={cardVariants}
                  whileHover={{ y: -8 }}
                  className="group block relative h-full overflow-hidden rounded-2xl border border-white/10 bg-[#0c1826]/80 backdrop-blur-sm shadow-[0_14px_35px_rgba(2,6,23,0.45)] transition-all duration-300 hover:border-accent/40 hover:shadow-[0_20px_48px_rgba(2,6,23,0.65)]"
                >
                  <div className="relative h-52 w-full overflow-hidden rounded-t-2xl">
                    {item.thumb ? (
                      <Image src={item.thumb} alt={title} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" unoptimized className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-xs uppercase tracking-[0.24em] text-white/35">
                        No Preview
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#08131e]/75 to-transparent" />
                    <div className="absolute top-3 right-3 rounded-full border border-accent bg-[#04131f]/50 px-3 py-1 text-accent text-sm font-extrabold tracking-wide ring-1 ring-accent/60 shadow-[0_0_0_1px_rgba(102,224,196,0.35),0_0_26px_rgba(102,224,196,0.45)] transition-transform duration-300 group-hover:scale-105">
                      #{item.num}
                    </div>
                  </div>

                  <div className="flex h-[calc(100%-13rem)] flex-col p-5">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-accent">
                        {item.category}
                      </span>
                    </div>

                    <div className="mb-2 flex items-start justify-between gap-3">
                      <h3 className="text-lg font-semibold text-white tracking-tight line-clamp-2">{title}</h3>
                      <span className="mt-0.5 text-accent/70 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                        <BsArrowUpRight />
                      </span>
                    </div>
                    <p className="text-white/65 text-sm mt-1 line-clamp-3 leading-relaxed">{item.description}</p>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {(item.techStack || []).slice(0, 4).map((t, i) => (
                        <span key={i} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80">
                          {typeof t === 'string' ? t : t.name}
                        </span>
                      ))}
                    </div>

                    <div className="mt-auto border-t border-white/10 pt-3 text-sm font-medium text-accent/90">
                      View project details
                    </div>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </motion.div>

        {/* pagination */}
        <div className="mt-8 flex items-center justify-between">
          <div className="text-white/60">Page {page} of {totalPages}</div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-white/80 transition-colors hover:bg-white/10 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Prev
            </button>
            <button
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-white/80 transition-colors hover:bg-white/10 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Work;
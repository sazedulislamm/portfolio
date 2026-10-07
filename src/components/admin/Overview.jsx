"use client";

import { useEffect, useMemo, useState } from 'react';

const emptySummary = {};

function formatRelativeTime(value) {
  if (!value) {
    return 'recently';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatClock(date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getProgressWidth(value) {
  const num = Number.parseInt(String(value), 10);
  return Number.isFinite(num) ? Math.min(Math.max(num, 0), 100) : 0;
}

export default function Overview({ onNavigate } = {}) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/admin/overview', {
          cache: 'no-store',
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load admin overview');
        }

        if (active) {
          setOverview(data);
        }
      } catch (fetchError) {
        if (active) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load admin overview');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOverview();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const summary = overview?.summary ?? emptySummary;
  const activities = overview?.recentActivity ?? [];

  const kpis = useMemo(() => [
    {
      title: 'Projects',
      value: loading ? '...' : String(summary.projects ?? 0),
      note: `${summary.publishedProjects ?? 0} published`,
      tone: 'text-slate-900',
    },
    {
      title: 'Blog posts',
      value: loading ? '...' : String(summary.posts ?? 0),
      note: `${summary.publishedPosts ?? 0} published · ${summary.draftPosts ?? 0} drafts`,
      tone: 'text-slate-900',
    },
    {
      title: 'Messages',
      value: loading ? '...' : String(summary.messages ?? 0),
      note: `${summary.unreadMessages ?? 0} unread`,
      tone: 'text-slate-900',
    },
    {
      title: 'Clients',
      value: loading ? '...' : String(summary.clients ?? 0),
      note: `${summary.activeClients ?? 0} active`,
      tone: 'text-slate-900',
    },
    {
      title: 'Services',
      value: loading ? '...' : String(summary.services ?? 0),
      note: 'Service catalog items',
      tone: 'text-slate-900',
    },
  ], [loading, summary]);

  const queue = useMemo(() => [
    {
      label: 'Review inbox',
      value: loading ? '...' : String(summary.unreadMessages ?? 0),
      detail: 'Messages waiting for a response',
      action: 'messages',
      muted: (summary.unreadMessages ?? 0) === 0,
    },
    {
      label: 'Publish projects',
      value: loading ? '...' : String(summary.inReviewProjects ?? 0),
      detail: 'Projects still awaiting approval',
      action: 'projects',
      muted: (summary.inReviewProjects ?? 0) === 0,
    },
    {
      label: 'Blog drafts',
      value: loading ? '...' : String(summary.draftPosts ?? 0),
      detail: 'Posts ready for review and publishing',
      action: 'blog',
      muted: (summary.draftPosts ?? 0) === 0,
    },
    {
      label: 'Client follow-up',
      value: loading ? '...' : String(summary.pendingClients ?? 0),
      detail: 'Client records needing attention',
      action: 'users',
      muted: (summary.pendingClients ?? 0) === 0,
    },
  ], [loading, summary]);

  const systemStatuses = [
    {
      label: 'Content readiness',
      value: loading ? '...' : `${overview?.systemStatus?.contentReadiness ?? 0}%`,
      color: 'bg-emerald-500',
    },
    {
      label: 'Publishing pace',
      value: loading ? '...' : `${summary.posts > 0 ? Math.round((summary.publishedPosts ?? 0) / Math.max(summary.posts ?? 1, 1) * 100) : 0}%`,
      color: 'bg-amber-500',
    },
    {
      label: 'Inbox health',
      value: loading ? '...' : `${overview?.systemStatus?.inboxHealth ?? 0}%`,
      color: 'bg-sky-500',
    },
    {
      label: 'Client coverage',
      value: loading ? '...' : `${overview?.systemStatus?.clientCoverage ?? 0}%`,
      color: 'bg-violet-500',
    },
  ];

  const actionItems = [
    { label: 'Open Projects', note: 'Review project progress and publication status', tab: 'projects' },
    { label: 'Open Blog', note: 'Review drafts, featured posts, and publishing status', tab: 'blog' },
    { label: 'Open Inbox', note: 'Reply to new leads and archived conversations', tab: 'messages' },
    { label: 'Open Clients', note: 'Manage client and partner records', tab: 'users' },
  ];

  const insightLines = [
    `${summary.publishedProjects ?? 0} published projects are currently visible on the portfolio.`,
    `${summary.publishedPosts ?? 0} blog posts are live, with ${summary.draftPosts ?? 0} drafts waiting.`,
    `${summary.unreadMessages ?? 0} inbox messages still need a reply.`,
    `${summary.pendingClients ?? 0} client records are waiting on status review.`,
  ];

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.25)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-300">Portfolio Control Center</p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Executive Overview</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
              A live snapshot of content, inbox, and client operations so you can spot work that needs attention before it gets buried.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-200">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">{overview?.source === 'd1' ? 'Live D1 data' : 'Local fallback'}</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Updated {formatRelativeTime(overview?.timestamp)}</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">{summary.projects ?? 0} projects tracked</span>
            </div>
          </div>

          <div className="grid min-w-[240px] gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Current date</p>
              <p className="mt-1 text-lg font-semibold">{formatDate(currentTime)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Current time</p>
              <p className="mt-1 font-mono text-base text-slate-100">{formatClock(currentTime)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <article
            key={kpi.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm text-slate-500">{kpi.title}</p>
            <p className={`mt-2 text-3xl font-semibold ${kpi.tone}`}>{kpi.value}</p>
            <p className="mt-2 text-xs text-slate-500">{kpi.note}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Priority Queue</h3>
              <p className="mt-1 text-sm text-slate-500">The items most likely to need action today.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Operational focus</span>
          </div>

          {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {queue.map((item) => (
              <article
                key={item.label}
                className={`rounded-2xl border p-4 ${item.muted ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'}`}
              >
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</p>
                <p className="mt-2 text-sm text-slate-500">{item.detail}</p>
                <button
                  type="button"
                  onClick={() => onNavigate?.(item.action)}
                  className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Review now
                </button>
              </article>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Recent activity</p>
            <ul className="mt-4 space-y-4">
              {activities.length > 0 ? activities.map((item) => (
                <li key={`${item.type}-${item.title}`} className="flex items-start gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-slate-900" />
                  <div className="w-full border-b border-slate-100 pb-4 last:border-none last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-800">{item.title}</p>
                      {item.type ? <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{item.type}</span> : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                    <p className="mt-1 text-xs text-slate-400">{item.time}</p>
                  </div>
                </li>
              )) : (
                <li className="rounded-xl bg-white px-4 py-3 text-sm text-slate-500">
                  No recent activity yet.
                </li>
              )}
            </ul>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">System Status</h3>
          <p className="mt-1 text-sm text-slate-500">Snapshot of the content and client operations layer.</p>
          <div className="mt-4 space-y-4">
            {systemStatuses.map((status) => (
              <div key={status.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-600">{status.label}</span>
                  <span className="font-medium text-slate-800">{status.value}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${status.color}`}
                    style={{ width: `${getProgressWidth(status.value)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">What to do next</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {insightLines.map((line) => (
                <li key={line} className="rounded-xl bg-white px-3 py-2">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
          <span className="text-xs text-slate-400">Jump straight to the right workspace</span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {actionItems.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => onNavigate?.(action.tab)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-white"
            >
              <p className="font-medium text-slate-800">{action.label}</p>
              <p className="mt-1 text-sm text-slate-500">{action.note}</p>
            </button>
          ))}
        </div>
      </article>
    </section>
  );
}

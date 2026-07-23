'use client';

import { useCallback, useEffect, useState } from 'react';

interface Comment {
  id: string;
  nickname: string;
  content: string;
  createdAt: string;
}

export default function Comments({ articleId }: { articleId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [nickname, setNickname] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?articleId=${encodeURIComponent(articleId)}`);
      const data = await res.json();
      setComments(data.comments ?? []);
    } catch {
      /* leave empty */
    }
  }, [articleId]);

  useEffect(() => { load(); }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, nickname, content }),
      });
      if (res.ok) {
        setContent('');
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="text-lg font-bold text-ink mb-4">댓글 {comments.length > 0 ? `(${comments.length})` : ''}</h2>

      <form onSubmit={submit} className="mb-6 space-y-2.5">
        <input
          type="text"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          placeholder="닉네임 (선택)"
          maxLength={30}
          className="w-full sm:w-56 rounded-md border border-line bg-surface-card px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:border-brand-400"
        />
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="방문 경험이나 궁금한 점을 남겨주세요 (최대 1000자)"
          maxLength={1000}
          rows={3}
          className="w-full rounded-md border border-line bg-surface-card px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:border-brand-400 resize-y"
        />
        <button
          type="submit"
          disabled={busy || !content.trim()}
          className="rounded-full bg-brand-600 text-white text-sm font-semibold px-5 py-2 hover:bg-brand-700 disabled:opacity-40 transition-colors"
        >
          {busy ? '등록 중…' : '댓글 등록'}
        </button>
      </form>

      {comments.length === 0 ? (
        <p className="text-sm text-ink-soft">아직 댓글이 없습니다. 첫 댓글을 남겨보세요.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map(c => (
            <li key={c.id} className="rounded-md bg-surface-sunk p-4">
              <div className="flex items-center gap-2 text-xs text-ink-soft mb-1.5">
                <span className="font-semibold text-ink-muted">{c.nickname || '익명'}</span>
                <span>·</span>
                <time dateTime={c.createdAt}>{new Date(c.createdAt).toLocaleDateString('ko')}</time>
              </div>
              <p className="text-sm text-ink-muted whitespace-pre-wrap">{c.content}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

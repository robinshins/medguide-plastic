import { NextRequest } from 'next/server';
import { getDb } from '@/lib/firebase';
import { COMMENTS_COLLECTION } from '@/lib/collections';

export const dynamic = 'force-dynamic';

// GET: fetch comments for an article (articleId === slug on these sites)
export async function GET(request: NextRequest) {
  const articleId = request.nextUrl.searchParams.get('articleId');
  if (!articleId) {
    return Response.json({ error: 'articleId required' }, { status: 400 });
  }

  try {
    const db = getDb();
    const snapshot = await db.collection(COMMENTS_COLLECTION)
      .where('articleId', '==', articleId)
      .limit(100)
      .get();

    const comments = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
        ((b.createdAt as string) || '').localeCompare((a.createdAt as string) || '')
      );

    return Response.json({ comments });
  } catch (e) {
    console.error('[Comments] GET error:', e);
    return Response.json({ comments: [] });
  }
}

// POST: add a comment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleId, nickname, content } = body;

    if (!articleId || !content || content.trim().length === 0) {
      return Response.json({ error: 'articleId and content required' }, { status: 400 });
    }
    if (content.length > 1000) {
      return Response.json({ error: 'Comment too long (max 1000 chars)' }, { status: 400 });
    }

    const db = getDb();
    const comment = {
      articleId,
      nickname: (nickname || '').trim().substring(0, 30) || '익명',
      content: content.trim().substring(0, 1000),
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection(COMMENTS_COLLECTION).add(comment);
    return Response.json({ success: true, id: docRef.id, comment });
  } catch (e) {
    console.error('[Comments] POST error:', e);
    return Response.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}

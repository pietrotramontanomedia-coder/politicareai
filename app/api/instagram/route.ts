import { erroreInstagram, leggiPost } from '@/lib/instagram-server';

export async function GET() {
  const post = await leggiPost();

  return Response.json({
    success: post.length > 0,
    post,
    errore: post.length > 0 ? null : erroreInstagram(),
    timestamp: new Date().toISOString(),
  });
}

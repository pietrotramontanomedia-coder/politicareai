import { leggiPost } from '@/lib/instagram-server';

export async function GET() {
  const post = await leggiPost();

  return Response.json({
    success: post.length > 0,
    post,
    timestamp: new Date().toISOString(),
  });
}

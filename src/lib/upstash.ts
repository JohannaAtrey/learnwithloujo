import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function rateLimiter(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const key = `ratelimit_${ip}`;
 
  const limit = 10; // number of requests
  const ttl = 60; // per 60 seconds

  try {
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, ttl);
    }

    if (current > limit) {
      return new NextResponse(JSON.stringify({ error: 'Too Many Requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Rate limiter error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
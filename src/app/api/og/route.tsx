import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const ALLOWED_IMAGE_HOSTS = ['ads-partners.coupang.com', 'thumbnail.coupangcdn.com'];

function isAllowedImageUrl(url: string | null): url is string {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && (ALLOWED_IMAGE_HOSTS.includes(hostname) || hostname.endsWith('.coupangcdn.com'));
  } catch {
    return false;
  }
}

// Font caching outside the request handler
let fontData: ArrayBuffer | null = null;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title') || '산다만다 쇼핑 가이드';
    const keyword = searchParams.get('keyword') || '추천 가이드';
    // 임의 URL을 서버가 가져오지 않도록 쿠팡 이미지 호스트만 허용
    const rawImageUrl = searchParams.get('imageUrl');
    const imageUrl = isAllowedImageUrl(rawImageUrl) ? rawImageUrl : null;
    const isSquare = searchParams.get('aspect') === 'square';
    const width = isSquare ? 1080 : 1200;
    const height = isSquare ? 1080 : 630;

    if (!fontData) {
      // 폰트를 CDN에서 1회만 다운로드하여 메모리에 캐싱
      const fontRes = await fetch(
        'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/public/static/Pretendard-Black.otf' // Black is bolder than Bold
      );
      fontData = await fontRes.arrayBuffer();
    }

    // 제목을 줄바꿈하기 위한 로직 (카드뉴스 스타일)
    const words = title.split(' ');
    const lines = [];
    let currentLine = '';
    for (const word of words) {
      if (currentLine.length + word.length > (isSquare ? 9 : 14)) {
        if (currentLine) lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    }
    if (currentLine) lines.push(currentLine.trim());

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            backgroundColor: '#ffffff',
            backgroundImage: 'radial-gradient(circle, #d1d5db 3px, transparent 3px)',
            backgroundSize: '40px 40px',
            fontFamily: '"Pretendard"',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Product Image (Huge, right bottom) */}
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- next/og renders plain <img>
            <img
              src={imageUrl}
              alt={title}
              style={{
                position: 'absolute',
                right: isSquare ? '-100px' : '-50px',
                bottom: isSquare ? '-100px' : '-150px',
                width: isSquare ? '800px' : '700px',
                height: isSquare ? '800px' : '700px',
                objectFit: 'contain',
                opacity: 1, // 백그라운드가 흰색이므로 상품의 흰 배경과 자연스럽게 섞임
              }}
            />
          )}

          {/* Text Overlays */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              position: 'absolute',
              top: isSquare ? '120px' : '80px',
              left: isSquare ? '80px' : '80px',
              zIndex: 10,
            }}
          >
            <div
              style={{
                color: '#16a34a', // KREAM 스타일의 그린 컬러
                fontSize: isSquare ? '48px' : '36px',
                fontWeight: '900',
                marginBottom: '20px',
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
                display: 'flex'
              }}
            >
              # {keyword}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {lines.map((line, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: isSquare ? '110px' : '80px',
                    fontWeight: '900',
                    color: '#111827',
                    lineHeight: 1.1,
                    letterSpacing: '-0.04em',
                    textShadow: '4px 4px 0px #ffffff, -4px -4px 0px #ffffff, 4px -4px 0px #ffffff, -4px 4px 0px #ffffff', // 흰색 테두리 효과
                    display: 'flex'
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
            
            <div
              style={{
                marginTop: '40px',
                fontSize: isSquare ? '32px' : '24px',
                color: '#6b7280',
                fontWeight: '900',
                letterSpacing: '-0.02em',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                padding: '10px 20px',
                borderRadius: '10px',
                display: 'flex'
              }}
            >
              산다만다 AI 쇼핑 가이드
            </div>
          </div>
        </div>
      ),
      {
        width,
        height,
        fonts: [
          {
            name: 'Pretendard',
            data: fontData,
            style: 'normal',
            weight: 700,
          },
        ],
      }
    );
  } catch (e: unknown) {
    console.error('OG Image Generation Error:', e);
    return new Response('Failed to generate image', { status: 500 });
  }
}

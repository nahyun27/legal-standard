'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container section" style={{ textAlign: 'center' }}>
      <h1>일시적인 오류가 발생했습니다</h1>
      <p className="lead" style={{ margin: '14px auto 24px' }}>잠시 후 다시 시도해 주세요.</p>
      <button className="btn btn-primary" onClick={reset}>다시 시도</button>
    </div>
  );
}

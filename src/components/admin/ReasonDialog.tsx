'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/**
 * 사유 입력 대화상자 — 정지·불성립·반려처럼 감사 로그에 남는 조치의 사유를 받는다.
 * 브라우저 기본 prompt() 는 여러 줄 입력·검증·접근성이 안 돼서 대신한다.
 */
interface Ask {
  title: string;
  description?: string;
  placeholder?: string;
  confirmLabel?: string;
  danger?: boolean;
}

type AskFn = (opts: Ask) => Promise<string | null>;
const Ctx = createContext<AskFn>(async () => null);
export const useReason = () => useContext(Ctx);

export function ReasonProvider({ children }: { children: React.ReactNode }) {
  const [ask, setAsk] = useState<(Ask & { resolve: (v: string | null) => void }) | null>(null);
  const [text, setText] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);

  const open: AskFn = useCallback((opts) => new Promise((resolve) => { setText(''); setAsk({ ...opts, resolve }); }), []);

  useEffect(() => {
    if (ask) dialog.current?.showModal();
    else dialog.current?.close();
  }, [ask]);

  function finish(v: string | null) {
    ask?.resolve(v);
    setAsk(null);
  }

  return (
    <Ctx.Provider value={open}>
      {children}
      <dialog ref={dialog} className="reason-dialog" onCancel={(e) => { e.preventDefault(); finish(null); }}>
        {ask && (
          <form method="dialog" onSubmit={(e) => { e.preventDefault(); if (text.trim().length >= 2) finish(text.trim()); }}>
            <h2>{ask.title}</h2>
            {ask.description && <p className="sub">{ask.description}</p>}
            <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={ask.placeholder} maxLength={1000} />
            <p className="sub">사유는 감사 로그에 남습니다. (2자 이상)</p>
            <div className="action-row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => finish(null)}>취소</button>
              <button type="submit" className={`btn ${ask.danger ? 'btn-ghost danger' : 'btn-primary'}`} disabled={text.trim().length < 2}>{ask.confirmLabel ?? '확인'}</button>
            </div>
          </form>
        )}
      </dialog>
    </Ctx.Provider>
  );
}

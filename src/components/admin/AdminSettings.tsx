'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldCheck, Upload } from 'lucide-react';
import { MfaSetup, useStaff, useStaffReload } from '@/components/admin/AdminShell';
import { AdminHead } from '@/components/admin/ui';
import { api, fmtDate, upload } from '@/lib/api';

interface ConflictList { count: number; updated_at: string | null; sample: { name: string; role: string | null; note: string | null }[] }

export default function AdminSettings() {
  const staff = useStaff();
  const reload = useStaffReload();
  const [list, setList] = useState<ConflictList | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(() => { if (staff.is_admin) api<ConflictList>('/admin/conflict-list').then(setList); }, [staff.is_admin]);
  useEffect(() => { load(); }, [load]);

  async function uploadCsv(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    setError(null); setMsg(null);
    try {
      const r = await upload<{ count: number }>('/admin/conflict-list', f);
      setMsg(`${r.count}명으로 명단을 교체했습니다.`);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  return (
    <>
      <AdminHead title="설정" />
      {error && <p className="form-error">{error}</p>}
      {msg && <p className="banner banner-good" style={{ marginTop: 0, marginBottom: 14 }}>{msg}</p>}

      <section className="admin-card">
        <h2><ShieldCheck size={17} style={{ verticalAlign: -3 }} /> 2단계 인증</h2>
        {staff.mfa_enabled ? (
          <p>등록되어 있습니다. 인증 앱을 바꾸거나 휴대폰을 잃어버렸다면 서버 관리자에게 초기화를 요청하세요 (<code>python -m app.cli reset-mfa</code>).</p>
        ) : enrolling ? (
          <div style={{ maxWidth: 420 }}><MfaSetup onDone={() => { setEnrolling(false); reload(); }} /></div>
        ) : (
          <>
            <p>{staff.mfa_required ? '이 환경에서는 2단계 인증이 필수입니다.' : '개발 환경이라 필수는 아니지만, 운영 환경에서는 반드시 필요합니다. 미리 등록해 두세요.'}</p>
            <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => setEnrolling(true)}>인증 앱 등록하기</button>
          </>
        )}
      </section>

      {staff.is_admin && (
        <section className="admin-card">
          <h2>이해충돌 명단</h2>
          <p style={{ marginBottom: 10 }}>
            법인 본체의 기존 의뢰인·상대방 명단입니다. 사건 수임 검토 때 상대방·의뢰인 이름과 자동 대조합니다
            ("(주)", "주식회사", 띄어쓰기는 무시). CSV 를 올리면 명단 전체가 교체됩니다.
          </p>
          <p className="sub">형식: 첫 열 <b>이름</b>, 둘째 열 <b>구분</b>(의뢰인·상대방), 셋째 열 <b>메모</b>(사건번호 등). 엑셀에서 CSV 로 저장한 파일도 됩니다.</p>
          <div className="action-row">
            <input ref={fileInput} type="file" accept=".csv,text/csv" hidden onChange={(e) => uploadCsv(e.target.files)} />
            <button className="btn btn-ghost" onClick={() => fileInput.current?.click()}><Upload size={15} /> CSV 올리기</button>
            {list && <span className="sub">현재 {list.count.toLocaleString()}명 · {list.updated_at ? `${fmtDate(list.updated_at, true)} 갱신` : '아직 없음'}</span>}
          </div>
          {list && list.sample.length > 0 && (
            <table className="table admin-table" style={{ marginTop: 14 }}>
              <thead><tr><th>이름</th><th>구분</th><th>메모</th></tr></thead>
              <tbody>{list.sample.map((r, i) => <tr key={i}><td>{r.name}</td><td>{r.role ?? '—'}</td><td>{r.note ?? ''}</td></tr>)}</tbody>
            </table>
          )}
        </section>
      )}

      {staff.is_admin && (
        <section className="admin-card">
          <h2>정기 작업</h2>
          <p style={{ marginBottom: 10 }}>서버에서 아래 명령을 정기적으로 실행해야 합니다(cron 또는 systemd timer).</p>
          <table className="table admin-table">
            <tbody>
              <tr><td><code>python -m app.cli reconcile-payments</code></td><td>매시간</td><td>결제창에서 결제 후 창을 닫아 반영되지 않은 결제를 토스와 대조해 반영</td></tr>
              <tr><td><code>python -m app.cli housekeeping</code></td><td>매일 오전</td><td>결제 대기 사건 안내(1회), 7일 지난 결제 대기 자동 취소</td></tr>
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}

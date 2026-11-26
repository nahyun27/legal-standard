import type { Area, PrepKey, Service, Track, TrackKind } from './types';

/**
 * 상품·정찰가(VAT 별도). 구성과 가격은 의뢰인 시안 v6 을 따른다 — v6 신규 상품(가사·행정·가압류·증거보전)은
 * 가격 확정 전이라 price: tbd + offered(제공 방식)로만 두고 접수는 열지 않는다(시안의 회색 제안가는 싣지 않는다).
 * 대부분의 상품은 두 방식의 가격을 함께 공개한다 — 서면만 받기(self, 본인 이름으로 제출) / 변호사에게 맡기기(atty, 변호사 명의).
 * 접수 가능한(stage: 'pilot') 상품의 가격은 백엔드 catalog.py 와 같아야 한다(tests/test_catalog.py 가 대조).
 * 가격 한 줄은 `{ kind: …, label: …, amount: … }` 형식을 지킬 것 — 테스트가 이 형식으로 읽는다.
 */

const APPEAR = { label: '변론기일 출석', per: '기일 1회당', options: [{ label: '수도권', amount: 700_000 }, { label: '비수도권', amount: 970_000 }] };

export const SERVICES: Service[] = [
  // ── 민사 ─────────────────────────────────────────────────────
  {
    slug: 'certified-letter',
    area: 'civil',
    name: '내용증명 발송',
    summary: '대여금 독촉, 보증금 반환 요구, 계약 해지 통보처럼 분쟁을 시작할 때 보내는 첫 공식 문서입니다.',
    tracks: [
      { kind: 'self', label: '서면만 받기', note: '작성·검토 + 발송 안내', amount: 55_000 },
      { kind: 'atty', label: '변호사에게 맡기기', note: '법무법인 명의·주소로 발송 — 내 주소는 적지 않아도 됩니다', amount: 450_000, retainer: true },
    ],
    chips: ['2영업일 안에 완성', '1회 수정 포함'],
    includes: ['온라인 문진으로 사실관계 정리', '내용증명 작성', '변호사 검토', '1회 수정'],
    excludes: ['상대방과의 협상·통화', '발송 이후 소송 절차(다음 단계 상품)'],
    costs: ['내용증명 우편 발송비'],
    turnaround: '2영업일 안에 완성',
    claimRequired: true,
    next: [{ slug: 'payment-order', when: '기한 내 지급하지 않으면' }],
    prep: 'money',
    stage: 'pilot',
  },
  {
    slug: 'payment-order',
    area: 'civil',
    name: '지급명령 신청',
    summary: '차용증이나 거래 내역이 있는 돈을 재판 없이 받을 수 있게 하는 법원 절차입니다.',
    tag: '여정 상품',
    tracks: [
      { kind: 'self', label: '서면만 받기', note: '신청서 + 전자소송 안내', amount: 150_000 },
      { kind: 'atty', label: '변호사에게 맡기기', note: '제출·송달·보정 대응', amount: 250_000, retainer: true },
    ],
    chips: ['3영업일 안에 완성', '이의 시 소송 가격 미리 공개'],
    includes: ['지급명령 신청서 작성', '변호사 검토', '보정명령 1회 대응'],
    excludes: ['채무자가 이의한 뒤의 소송(다음 단계 상품)', '강제집행(다음 단계 상품)'],
    costs: ['인지대', '송달료'],
    turnaround: '3영업일 안에 완성',
    claimRequired: true,
    next: [
      { slug: 'small-claims', when: '채무자가 이의신청하면 소송으로 전환' },
      { slug: 'seizure', when: '확정 후에도 지급하지 않으면' },
    ],
    prep: 'money',
    stage: 'pilot',
  },
  {
    slug: 'lease-registration',
    area: 'civil',
    name: '임차권등기명령',
    summary: '보증금을 돌려받지 못한 채 이사해야 할 때, 대항력과 우선변제권을 지키기 위해 신청합니다.',
    tracks: [
      { kind: 'self', label: '서면만 받기', amount: 110_000 },
      { kind: 'atty', label: '변호사에게 맡기기', amount: 220_000, retainer: true },
    ],
    chips: ['3영업일 안에 완성', '보증금 돌려받기 단계와 연결'],
    costs: ['인지대', '송달료', '등기촉탁 수수료'],
    turnaround: '3영업일 안에 완성',
    next: [{ slug: 'payment-order', when: '그래도 보증금을 돌려주지 않으면' }],
    prep: 'lease',
    stage: 'launch',
  },
  {
    slug: 'small-claims',
    area: 'civil',
    name: '소액재판 소장',
    unit: '소가 3,000만 원 이하 금전 청구',
    summary: '지급명령에 이의가 들어왔거나 처음부터 소송으로 가야 할 때 쓰는 소장입니다. 전자소송으로 진행합니다.',
    tag: '여정 상품',
    tracks: [
      { kind: 'self', label: '서면만 받기', note: '소장 + 진행 안내', amount: 300_000 },
      { kind: 'atty', label: '변호사에게 맡기기', note: '서면·절차 수행, 기일은 본인 출석', amount: 680_000, retainer: true },
    ],
    addons: [APPEAR],
    chips: ['5영업일 안에 완성', '출석이 필요 없는 사건이면 추가 비용 없음'],
    costs: ['인지대', '송달료'],
    turnaround: '5영업일 안에 완성',
    next: [{ slug: 'seizure', when: '판결 후에도 지급하지 않으면' }],
    prep: 'money',
    stage: 'launch',
  },
  {
    slug: 'answer-brief',
    area: 'civil',
    name: '답변서 · 준비서면',
    summary: '소장이나 지급명령을 받았을 때 피고 쪽에서 내는 대응 서면입니다.',
    tracks: [
      { kind: 'self', label: '서면만 받기', amount: 300_000 },
      { kind: 'atty', label: '변호사에게 맡기기', amount: 680_000, retainer: true },
    ],
    addons: [APPEAR],
    chips: ['5영업일 안에 완성'],
    turnaround: '5영업일 안에 완성',
    prep: 'litigation',
    stage: 'launch',
  },
  {
    slug: 'seizure',
    area: 'civil',
    name: '채권 압류 및 추심',
    summary: '판결이나 지급명령을 받은 뒤에도 돈을 주지 않을 때, 상대방의 예금·급여에서 받아 내는 절차입니다.',
    tag: '집행',
    tracks: [
      { kind: 'self', label: '서면만 받기', amount: 110_000 },
      { kind: 'atty', label: '변호사에게 맡기기', amount: 220_000, retainer: true },
    ],
    chips: ['3영업일 안에 완성', '재산조회와 함께 신청 가능'],
    costs: ['인지대', '송달료'],
    turnaround: '3영업일 안에 완성',
    next: [{ slug: 'asset-inquiry', when: '압류할 재산을 모르면' }],
    prep: 'enforcement',
    stage: 'launch',
  },
  {
    slug: 'asset-disclosure',
    area: 'civil',
    name: '재산명시 신청',
    summary: '채무자에게 법원에 재산 목록을 내라고 명하게 하는 절차입니다.',
    tag: '집행',
    tracks: [
      { kind: 'self', label: '서면만 받기', amount: 80_000 },
      { kind: 'atty', label: '변호사에게 맡기기', amount: 180_000, retainer: true },
    ],
    chips: ['3영업일 안에 완성'],
    costs: ['인지대', '송달료'],
    turnaround: '3영업일 안에 완성',
    prep: 'enforcement',
    stage: 'launch',
  },
  {
    slug: 'debtor-registry',
    area: 'civil',
    name: '채무불이행자명부 등재',
    summary: '갚지 않는 채무자를 법원의 채무불이행자명부에 올리는 절차입니다.',
    tag: '집행',
    tracks: [
      { kind: 'self', label: '서면만 받기', amount: 80_000 },
      { kind: 'atty', label: '변호사에게 맡기기', amount: 180_000, retainer: true },
    ],
    chips: ['3영업일 안에 완성'],
    costs: ['인지대', '송달료'],
    turnaround: '3영업일 안에 완성',
    prep: 'enforcement',
    stage: 'launch',
  },
  {
    slug: 'asset-inquiry',
    area: 'civil',
    name: '법원 재산조회',
    summary: '법원을 통해 채무자 명의의 예금·부동산·자동차 같은 재산을 조회합니다.',
    tag: '집행',
    tracks: [
      { kind: 'self', label: '서면만 받기', amount: 80_000 },
      { kind: 'atty', label: '변호사에게 맡기기', amount: 180_000, retainer: true },
    ],
    chips: ['3영업일 안에 완성'],
    costs: ['인지대', '조회 비용'],
    turnaround: '3영업일 안에 완성',
    next: [{ slug: 'seizure', when: '재산이 확인되면' }],
    prep: 'enforcement',
    stage: 'launch',
  },
  {
    slug: 'cost-fixation',
    area: 'civil',
    name: '소송비용액 확정',
    summary: '승소한 뒤 상대방에게 소송에 든 비용을 청구할 수 있게 금액을 확정받는 절차입니다.',
    tracks: [
      { kind: 'self', label: '서면만 받기', amount: 80_000 },
      { kind: 'atty', label: '변호사에게 맡기기', amount: 180_000, retainer: true },
    ],
    chips: ['3영업일 안에 완성'],
    costs: ['인지대', '송달료'],
    turnaround: '3영업일 안에 완성',
    prep: 'litigation',
    stage: 'launch',
  },
  {
    slug: 'settlement',
    area: 'civil',
    name: '합의서 작성',
    summary: '분쟁을 끝내는 마지막 문서입니다. 합의 조건이 빠짐없이 들어가도록 작성합니다.',
    tracks: [
      { kind: 'self', label: '합의서 작성', note: '검토·작성 후 전달', amount: 50_000 },
      { kind: 'atty', label: '변호사 개입형', note: '상대방 협의·합의금 수령 대행', amount: 550_000, retainer: true },
    ],
    chips: ['2영업일 안에 완성'],
    turnaround: '2영업일 안에 완성',
    prep: 'settlement',
    stage: 'launch',
  },

  // 시안 v6 추가 — 가격 확정 전이라 접수는 열지 않는다(stage: 'launch', price: tbd)
  {
    slug: 'provisional-attachment',
    area: 'civil',
    name: '부동산 · 채권 가압류',
    summary: '소송이 끝나기 전에 상대방이 부동산이나 예금·채권을 처분하지 못하도록 묶어 두는 절차입니다.',
    tag: '보전',
    price: { kind: 'tbd' },
    offered: ['self', 'atty'],
    chips: ['변호사 출석 없음'],
    includes: ['가압류 신청서·진술서 작성', '변호사 검토', '서면만 받기: 제출 안내서', '변호사에게 맡기기: 제출·보정·담보 제공 대응'],
    costs: ['인지대', '송달료', '등록면허세·등기신청수수료(부동산)', '담보 제공 비용(보증보험료 또는 공탁금)'],
    prep: 'money',
    stage: 'launch',
  },
  {
    slug: 'evidence-preservation',
    area: 'civil',
    name: '증거보전 신청',
    summary: 'CCTV·블랙박스 영상처럼 곧 지워질 수 있는 증거를 소송 전에 법원을 통해 확보합니다.',
    tag: '증거',
    price: { kind: 'tbd' },
    offered: ['self', 'atty'],
    chips: ['변호사 출석 없음'],
    costs: ['인지대', '송달료'],
    prep: 'litigation',
    stage: 'launch',
  },

  // ── 형사 ─────────────────────────────────────────────────────
  {
    slug: 'complaint',
    area: 'criminal',
    name: '형사 고소장',
    unit: '고소사실 1개당',
    summary: '사기, 횡령, 폭행, 명예훼손 같은 피해를 고소할 때 구성요건과 증거를 갖춰 쓰는 고소장입니다.',
    tag: '여정 상품',
    tracks: [
      { kind: 'self', label: '서면만 받기', note: '고소장 + 접수 안내', amount: 220_000 },
      { kind: 'atty', label: '변호사에게 맡기기', note: '고소대리인 선임계 제출 포함', amount: 480_000, retainer: true },
    ],
    addons: [{ label: '고소인 조사 출석 동행', per: '1회당', options: APPEAR.options }],
    unitCount: { label: '고소사실', max: 5 },
    chips: ['5영업일 안에 완성', '불송치 이의신청과 연결'],
    includes: ['고소장 작성', '구성요건·증거목록 검토', '변호사 검토', '1회 수정'],
    excludes: ['피의자 측과의 합의 협상'],
    turnaround: '5영업일 안에 완성',
    next: [{ slug: 'objection', when: '불송치 결정이 나오면' }],
    prep: 'criminal',
    stage: 'pilot',
  },
  {
    slug: 'objection',
    area: 'criminal',
    name: '불송치 이의신청 · 재정신청',
    summary: '경찰의 불송치 결정이나 검사의 불기소 처분에 불복할 때 내는 서면입니다.',
    tracks: [
      { kind: 'self', label: '서면만 받기', amount: 220_000 },
      { kind: 'atty', label: '변호사에게 맡기기', amount: 480_000, retainer: true },
    ],
    chips: ['결정문 분석 포함', '5영업일 안에 완성'],
    turnaround: '5영업일 안에 완성',
    prep: 'criminal',
    stage: 'launch',
  },
  {
    slug: 'victim-opinion',
    area: 'criminal',
    name: '의견서',
    unit: '고소인·피해자 의견서',
    summary: '수사나 재판 단계에서 피해자의 입장을 법리에 맞춰 전달하는 서면입니다.',
    tracks: [
      { kind: 'self', label: '서면만 받기', amount: 220_000 },
      { kind: 'atty', label: '변호사에게 맡기기', amount: 480_000, retainer: true },
    ],
    chips: ['5영업일 안에 완성'],
    turnaround: '5영업일 안에 완성',
    prep: 'criminal',
    stage: 'launch',
  },
  {
    slug: 'criminal-mediation',
    area: 'criminal',
    name: '형사조정 조력',
    summary: '형사조정 절차에서 조정안을 검토하고 조정기일을 함께 준비합니다.',
    tracks: [
      { kind: 'atty', label: '변호사 조력', note: '전략 수립 · 조정안 검토 · 기일 조력', amount: 550_000, retainer: true },
    ],
    chips: ['조정 단계 전용'],
    prep: 'criminal',
    stage: 'launch',
  },
  {
    slug: 'restitution',
    area: 'criminal',
    name: '배상명령 신청',
    summary: '형사재판이 열렸을 때 피고인에게 피해 배상을 함께 청구하는 신청입니다.',
    tracks: [
      { kind: 'self', label: '서면만 받기', amount: 90_000 },
      { kind: 'atty', label: '변호사에게 맡기기', amount: 180_000, retainer: true },
    ],
    chips: ['피해금액 산정 포함'],
    prep: 'criminal',
    stage: 'launch',
  },
  {
    slug: 'petition',
    area: 'criminal',
    name: '엄벌탄원서',
    summary: '피해자로서 엄중한 처벌을 바란다는 뜻을 수사기관이나 법원에 전달하는 서면입니다.',
    tracks: [
      { kind: 'self', label: '서면만 받기', amount: 40_000 },
      { kind: 'atty', label: '변호사에게 맡기기', amount: 100_000 },
    ],
    chips: ['2영업일 안에 완성'],
    turnaround: '2영업일 안에 완성',
    prep: 'criminal',
    stage: 'launch',
  },
  {
    slug: 'suspect-defense',
    area: 'criminal',
    name: '피의사건 정찰 변호',
    unit: '혐의를 인정하는 사건 · 혐의 1개 기준',
    summary: '음주운전, 단순 폭행, 초범 사건처럼 사실관계에 다툼이 없는 사건의 양형 변론을 단계별 정찰가로 맡습니다.',
    tag: '피의자 변호',
    ladder: [
      { key: 'opinion', label: '수사단계 의견서', note: '양형자료 정리 · 변호인 의견서 제출', amount: 1_100_000 },
      { key: 'appear', label: '수사단계 출석 변호', note: '조사 입회 포함', amount: 2_200_000 },
      { key: 'trial', label: '법원단계 변론', note: '약식명령 이의 · 공판 변론', amount: 3_300_000 },
    ],
    screening: '혐의를 인정하고 사실관계를 다투지 않는 사건, 혐의 1개, 불구속 사건에 한합니다. 진행 중 혐의를 다투게 되면 일반 수임으로 바뀌며, 이미 낸 금액은 전부 빼고 계산합니다.',
    screenQuestions: [
      { key: 'confession', question: '혐의를 인정하고 사실관계를 다투지 않나요?', required: '예', options: ['예', '아니오', '잘 모르겠음'] },
      { key: 'charges', question: '혐의는 몇 개인가요?', required: '1개', options: ['1개', '2개 이상'] },
      { key: 'custody', question: '구속되었거나 구속영장이 청구되었나요?', required: '아니오', options: ['예', '아니오'] },
    ],
    prep: 'defense',
    stage: 'pilot',
  },

  // ── 가사(시안 v6 추가 · 가격 확정 전) ───────────────────────
  {
    slug: 'inheritance-package',
    area: 'family',
    group: '상속',
    name: '상속포기 · 한정승인',
    unit: '가족 패키지 · 1인당 정액',
    summary: '물려받을 빚이 재산보다 많을 때 씁니다. 가족 구성원마다 상속포기와 한정승인을 따로 고르고 한 번에 접수합니다.',
    tag: '가족 패키지',
    price: { kind: 'tbd' },
    offered: ['self', 'atty'],
    partsTitle: '품목(1인당)',
    parts: [{ label: '상속포기' }, { label: '한정승인', note: '재산목록 포함' }, { label: '특별한정승인' }],
    chips: ['신고 기한: 상속 개시를 안 날부터 3개월', '누가 포기하고 누가 한정승인할지 안내'],
    costs: ['인지대', '송달료', '신문공고료(한정승인)'],
    prep: 'inheritance',
    stage: 'launch',
  },
  {
    slug: 'inheritance-division',
    area: 'family',
    group: '상속',
    name: '상속재산분할협의서 · 특별대리인 선임',
    summary: '상속인 전원의 합의를 등기와 예금 정리에 쓸 수 있는 문서로 만듭니다. 미성년 자녀가 함께 상속인이면 특별대리인 선임부터 진행합니다.',
    price: { kind: 'tbd' },
    offered: ['self', 'atty'],
    partsTitle: '품목',
    parts: [{ label: '상속재산분할협의서', note: '사건별 맞춤 작성' }, { label: '특별대리인 선임', note: '심판청구서' }],
    costs: ['인지대', '송달료'],
    prep: 'inheritance',
    stage: 'launch',
  },
  {
    slug: 'guardianship',
    area: 'family',
    group: '가족',
    name: '성년 · 한정후견 개시',
    summary: '치매·발달장애 등으로 스스로 재산을 관리하기 어려운 가족을 위해 법원에 후견인을 정해 달라고 청구합니다.',
    tag: '출석 포함',
    price: { kind: 'tbd' },
    offered: ['self', 'atty'],
    attendance: '심문기일 출석 1회 포함 · 가족 사이에 다툼이 있는 경우(변호사에게 맡기기)',
    costs: ['인지대', '송달료', '감정료'],
    prep: 'guardianship',
    stage: 'launch',
  },
  {
    slug: 'name-change',
    area: 'family',
    group: '가족',
    name: '개명 신청',
    unit: '개명허가 신청서',
    summary: '몇 가지 질문에 답하면 개명허가 신청서와 제출 안내를 받습니다.',
    tag: '간편 서식',
    price: { kind: 'tbd' },
    offered: ['self'],
    chips: ['성별정정 허가신청은 구성 확정 전'],
    costs: ['인지대', '송달료'],
    prep: 'name',
    stage: 'launch',
  },
  {
    slug: 'divorce-suit',
    area: 'family',
    group: '이혼',
    name: '이혼 소송',
    unit: '소장 · 변호사에게 맡기기 전용',
    summary: '협의가 되지 않을 때 소장 작성부터 가사조사 대응, 재산 확보 절차까지 한 상품으로 맡깁니다.',
    tag: '출석 포함',
    price: { kind: 'tbd' },
    offered: ['atty'],
    partsTitle: '포함 업무',
    parts: [
      { label: '소장 작성·제출' },
      { label: '가사조사 대응' },
      { label: '사전처분 신청', note: '양육비·접근금지·부양료·면접교섭' },
      { label: '재산목록 작성, 재산조회 신청' },
      { label: '가압류·가처분, 증거보전 신청' },
    ],
    attendance: '기일 출석 최대 3회 포함 · 3회를 넘는 기일은 1회당 수도권 700,000원 / 비수도권 970,000원',
    costs: ['인지대', '송달료', '재산조회 비용'],
    prep: 'divorce',
    stage: 'launch',
  },
  {
    slug: 'divorce-mediation',
    area: 'family',
    group: '이혼',
    name: '이혼 조정신청',
    summary: '이혼 조건에 대체로 뜻이 모였을 때 법원 조정으로 이혼과 재산·양육 문제를 함께 정리합니다.',
    tag: '출석 포함',
    price: { kind: 'tbd' },
    offered: ['atty'],
    attendance: '조정기일 출석 1회 포함',
    costs: ['인지대', '송달료'],
    prep: 'divorce',
    stage: 'launch',
  },
  {
    slug: 'divorce-agreement',
    area: 'family',
    group: '이혼',
    name: '협의이혼 패키지',
    summary: '이혼에 합의한 부부를 위한 서류 묶음입니다. 재산분할·위자료 합의서는 사정에 맞춰 새로 쓰고, 법원에 낼 서식을 함께 드립니다.',
    price: { kind: 'tbd' },
    offered: ['self', 'atty'],
    partsTitle: '포함 서류',
    parts: [
      { label: '재산분할·위자료 합의서', note: '맞춤 작성' },
      { label: '협의이혼의사확인신청서', note: '서식 제공' },
      { label: '양육·친권자결정 협의서', note: '서식 제공' },
    ],
    chips: ['변호사 출석 없음', '법원 확인기일은 부부가 직접 출석'],
    prep: 'divorce',
    stage: 'launch',
  },
  {
    slug: 'paramour-suit',
    area: 'family',
    group: '이혼',
    name: '상간자 소송',
    unit: '위자료 청구 · 청구하는 쪽과 청구받은 쪽 모두',
    summary: '배우자의 부정행위 상대방에게 위자료를 청구하는 소송입니다. 소를 제기하는 쪽도, 소장을 받은 쪽도 맡길 수 있습니다.',
    tag: '출석 포함',
    price: { kind: 'tbd' },
    offered: ['atty'],
    partsTitle: '맡기는 쪽',
    parts: [
      { label: '청구하는 쪽(원고)', note: '소장 · 증거보전 신청' },
      { label: '청구받은 쪽(피고)', note: '답변서·준비서면 · 반성문 · 탄원서' },
    ],
    attendance: '변론기일 출석 1회 포함',
    screeningTitle: '접수 조건',
    screening: '같은 사건의 상대방이 이미 의뢰한 경우에는 맡을 수 없습니다. 접수 단계에서 상대방 정보를 확인합니다.',
    costs: ['인지대', '송달료'],
    prep: 'divorce',
    stage: 'launch',
  },
  {
    slug: 'child-support-order',
    area: 'family',
    group: '이혼',
    name: '양육비 직접지급명령 신청',
    summary: '정해진 양육비를 2회 이상 받지 못했을 때, 상대방의 급여에서 양육비를 바로 받도록 법원에 신청합니다.',
    price: { kind: 'tbd' },
    offered: ['self', 'atty'],
    chips: ['변호사 출석 없음'],
    screeningTitle: '신청 조건',
    screening: '양육비를 정한 판결·조정조서 등이 있고, 상대방이 회사에서 급여를 받는 경우에 신청할 수 있습니다.',
    costs: ['인지대', '송달료'],
    prep: 'divorce',
    stage: 'launch',
  },

  // ── 행정(시안 v6 추가 · 가격 확정 전) ───────────────────────
  {
    slug: 'license-relief',
    area: 'admin',
    name: '운전면허 취소 · 정지 구제',
    unit: '이의신청 → 행정심판',
    summary: '면허 취소·정지 처분을 받았을 때 시·도경찰청 이의신청과 행정심판 청구 서면을 준비합니다.',
    price: { kind: 'tbd' },
    offered: ['self', 'atty'],
    partsTitle: '단계',
    parts: [
      { label: '이의신청', note: '처분을 받은 날부터 60일 안에' },
      { label: '행정심판', note: '처분이 있음을 안 날부터 90일 안에 · 이의신청을 거쳤으면 결과를 통보받은 날부터 90일' },
    ],
    chips: ['변호사 출석 없음'],
    prep: 'license',
    stage: 'launch',
  },
  {
    slug: 'school-violence',
    area: 'admin',
    name: '학교폭력 대응',
    unit: '심의위원회 의견서 → 행정심판',
    summary: '학교폭력대책심의위원회에 낼 의견서와, 조치 결정에 대한 행정심판 청구 서면을 준비합니다. 가해 학생 측과 피해 학생 측 모두 맡길 수 있습니다.',
    price: { kind: 'tbd' },
    offered: ['self', 'atty'],
    partsTitle: '단계',
    parts: [
      { label: '심의위원회 의견서' },
      { label: '행정심판', note: '처분이 있음을 안 날부터 90일 안에' },
    ],
    chips: ['변호사 출석 없음'],
    screeningTitle: '접수 조건',
    screening: '같은 사건의 상대방이 이미 의뢰한 경우에는 맡을 수 없습니다. 접수 단계에서 상대방 정보를 확인합니다.',
    prep: 'school',
    stage: 'launch',
  },

  // ── 자문 ─────────────────────────────────────────────────────
  {
    slug: 'contract-review',
    area: 'advisory',
    name: '계약서 검토',
    unit: '국문 계약서 · 장수 구간별 가격',
    summary: '임대차·용역·근로·공급·동업 계약서에 서명하기 전에 조항별 위험을 확인합니다. 조항마다 위험 정도를 표시하고 종합 의견을 드립니다.',
    tag: '분쟁 예방',
    bands: [
      { key: 'p5', label: '1~5장', amount: 90_000, max: 5 },
      { key: 'p10', label: '6~10장', amount: 150_000, max: 10 },
      { key: 'p20', label: '11~20장', amount: 300_000, max: 20 },
      { key: 'p20plus', label: '20장 초과', amount: 1_000_000 },
    ],
    chips: ['A4 기준 · 별첨 포함 · 표지 제외', 'PDF 를 올리면 장수를 세어 구간을 골라 드립니다', '영문·투자 계약은 개별 견적'],
    prep: 'contract',
    stage: 'pilot',
  },
  {
    slug: 'agency-media',
    area: 'advisory',
    name: '기관 · 언론 대응 자문',
    unit: '주 단위',
    summary: '행정기관 조사나 언론 보도가 생겼을 때 대응 방향을 세우고 답변서·입장문을 주 단위로 검토합니다.',
    tracks: [
      { kind: 'atty', label: '변호사 자문', note: '1주 단위 · 범위는 약정서에 정함', amount: 550_000, retainer: true, per: '주' },
    ],
    chips: ['대응 방향 · 서면 검토 · 전화 협의'],
    prep: 'advisory',
    stage: 'launch',
  },
  {
    slug: 'labor-hr',
    area: 'advisory',
    name: '노무 · 인사 컨설팅',
    unit: '이슈별',
    summary: '해고·징계, 임금, 직장 내 괴롭힘처럼 하나의 노무 문제를 끝까지 검토합니다.',
    tracks: [
      { kind: 'atty', label: '변호사 자문', note: '사실관계 검토 + 대응 의견서 + 서식', amount: 330_000, per: '이슈' },
    ],
    chips: ['진정 대응 등 절차 수행은 별도 안내', '월 단위 자문으로 바꿀 수 있음'],
    prep: 'advisory',
    stage: 'launch',
  },

  // ── 개별 상담 ────────────────────────────────────────────────
  {
    slug: 'advanced',
    area: 'consult',
    name: '심화 사건 상담',
    summary: '정해진 상품으로 처리하기 어려운 사건이나 금액이 큰 사건은 법무법인 변호사가 처음부터 개별 상담합니다.',
    price: { kind: 'quote' },
    includes: ['담당 변호사 배정 상담', '사건별 견적'],
    excludes: [],
    turnaround: '접수 다음 영업일까지 연락',
    prep: 'litigation',
    stage: 'pilot',
  },
];

/** 탭 순서 = 키 순서 */
export const AREA_LABEL: Record<Exclude<Area, 'consult'>, string> = {
  civil: '민사',
  criminal: '형사',
  family: '가사',
  admin: '행정',
  advisory: '자문',
};

export const AREA_NOTE: Record<Exclude<Area, 'consult'>, string> = {
  civil: '민사는 청구 금액 3,000만 원 이하 소액사건과 보전·집행 신청으로 구성했습니다.',
  criminal: '고소 상품은 고소사실 1개 기준 가격입니다. 피의사건은 혐의를 인정하는 사건(혐의 1개)만 정찰가로 맡습니다.',
  family: '가사는 상속·가족·이혼 세 묶음입니다. 출석이 필요한 상품은 정해진 횟수의 기일 출석이 가격에 포함됩니다.',
  admin: '처분에 대한 이의신청과 행정심판 서면입니다. 불복 기한이 짧으니 처분서를 받은 날짜를 먼저 확인하세요.',
  advisory: '월 고문료 없이 건별로 맡기는 자문입니다.',
};

/** 영역 안 묶음(group)의 한 줄 설명 */
export const GROUP_NOTE: Record<string, string> = {
  상속: '당사자도 변호사도 법원에 출석하지 않습니다',
};

/** 두 방식의 설명 — 홈·상세 페이지의 방식 비교에 쓴다 */
/** 각 단계를 누가 하는지 — 홈 "두 가지 방식" 흐름도의 배지 */
export type Actor = 'me' | 'atty';
export const ACTOR_LABEL: Record<Actor, string> = { me: '나', atty: '변호사' };

/** 두 방식이 같이 거치는 단계(흐름도의 줄기) */
export const TRACK_COMMON: { who: Actor; text: string }[] = [
  { who: 'me', text: '온라인 문진·결제' },
  { who: 'atty', text: '담당 변호사가 서면 검토' },
];

export const TRACK_INFO: Record<TrackKind, { title: string; lead: string; fit: string; points: string[]; steps: { who: Actor; text: string; note?: string }[] }> = {
  self: {
    title: '서면만 받기',
    lead: '변호사가 검토한 서면을 받아 직접 제출하세요.',
    fit: '제출은 직접 할 수 있고, 서면 작성에 도움이 필요한 분',
    points: ['서면은 담당 변호사가 검토합니다', '제출 방법을 적은 안내서를 함께 드립니다', '수임약정 없이 진행합니다'],
    steps: [
      { who: 'me', text: '서면·제출 안내서 받기' },
      { who: 'me', text: '내 이름으로 제출' },
      { who: 'me', text: '이후 절차는 직접 진행' },
    ],
  },
  atty: {
    title: '변호사에게 맡기기',
    lead: '서면 제출부터 보정·송달 대응까지 변호사에게 맡기세요.',
    fit: '직접 진행하기 어렵거나, 제출 뒤 법원 연락까지 맡기고 싶은 분',
    points: ['서면은 담당 변호사가 검토합니다', '변호사 이름으로 제출·발송합니다', '보정·송달 같은 이후 절차도 대응합니다'],
    steps: [
      { who: 'me', text: '온라인 수임약정 서명' },
      { who: 'atty', text: '변호사 이름으로 제출' },
      { who: 'atty', text: '보정·송달 대응' },
    ],
  },
};

export const STAGE_LABEL = {
  pilot: '접수 중',
  launch: '오픈 예정',
  later: '준비 중',
} as const;

export function getService(slug: string) {
  return SERVICES.find((s) => s.slug === slug);
}

export function serviceTitle(s: Service) {
  return s.name;
}

/** 이 상품이 제공하는 방식 — 가격이 있으면 tracks, 가격 확정 전이면 offered */
export function waysOf(s: Service): TrackKind[] {
  return s.tracks?.map((t) => t.kind) ?? s.offered ?? [];
}

export function trackOf(s: Service, kind: TrackKind | undefined): Track | undefined {
  return s.tracks?.find((t) => t.kind === kind);
}

/** 주문할 때 고르는 가격 선택지 — 두 방식(tracks)·단계(ladder)·장수 구간(bands)을 한 모양으로. key 는 백엔드 선택지 키 */
export interface OrderOption { key: string; label: string; amount: number; note?: string; retainer?: boolean; per?: string; max?: number }

export function orderOptions(s: Service): OrderOption[] {
  if (s.tracks) return s.tracks.map((t) => ({ key: t.kind, label: t.label, amount: t.amount, note: t.note, retainer: t.retainer, per: t.per }));
  if (s.ladder) return s.ladder.map((r) => ({ key: r.key, label: r.label, amount: r.amount, note: r.note, retainer: true }));
  if (s.bands) return s.bands.map((b) => ({ key: b.key, label: b.label, amount: b.amount, max: b.max }));
  return [];
}

export function optionOf(s: Service, key: string | undefined): OrderOption | undefined {
  return orderOptions(s).find((o) => o.key === key);
}

/** 선택지 고르기의 제목 */
export function optionTitle(s: Service): string {
  return s.ladder ? '맡길 단계' : s.bands ? '계약서 장수' : '진행 방식';
}

/** 장수로 구간 고르기(계약서 검토) */
export function bandFor(s: Service, pages: number): OrderOption | undefined {
  return orderOptions(s).find((o) => o.max === undefined || pages <= o.max);
}

/**
 * 방식별 금액. 고른 방식이 없는 상품(한 방식만 있는 상품)은 있는 방식 가격을 쓴다.
 * 장수 구간·단계별 가격은 [가장 낮은 값, 가장 높은 값], 견적·미정은 null.
 */
export function amountRange(s: Service, kind?: string): [number, number] | null {
  if (s.tracks?.length) {
    const t = s.tracks.find((x) => x.kind === kind) ?? s.tracks[0];
    return [t.amount, t.amount];
  }
  const list = s.bands ?? s.ladder;
  if (list?.length) {
    const xs = list.map((x) => x.amount);
    return [Math.min(...xs), Math.max(...xs)];
  }
  return null;
}

/** 이 상품에서 가장 낮은 가격 — "○○원부터" 표기용 */
export function lowestAmount(s: Service): number | null {
  const xs = [...(s.tracks ?? []), ...(s.bands ?? []), ...(s.ladder ?? [])].map((x) => x.amount);
  return xs.length ? Math.min(...xs) : null;
}

/** 상품 상세 "준비하면 좋은 자료" — 문진 문항(intakeQuestions)과 함께 검토 시간을 줄인다. */
export const PREP: Record<PrepKey, string[]> = {
  money: ['차용증·계약서·거래명세서', '계좌이체 내역 또는 영수증', '갚으라고 요구한 문자·카카오톡 대화', '상대방 주소와 연락처'],
  lease: ['임대차계약서', '보증금을 보낸 이체 내역', '확정일자·전입신고 확인 자료', '집주인과 주고받은 연락'],
  litigation: ['법원·상대방에게서 받은 서류', '계약서·증거 자료', '지금까지의 진행 경과 메모'],
  enforcement: ['판결문 또는 확정된 지급명령(집행권원)', '송달·확정 증명원', '알고 있는 상대방 재산 정보(거래 은행·직장 등)'],
  settlement: ['합의할 조건 메모(금액·지급일·조건)', '분쟁 경위를 알 수 있는 자료', '상대방 인적사항'],
  criminal: ['피해 사실이 드러나는 대화·게시물 캡처', '송금 내역(재산 피해인 경우)', '진단서·사진(신체 피해인 경우)', '상대방에 대해 아는 정보(이름·연락처·계좌·아이디)'],
  defense: ['출석요구서나 수사기관에서 받은 서류', '반성문·탄원서 등 양형 자료', '피해자와의 합의 여부를 알 수 있는 자료'],
  contract: ['검토받을 계약서 파일(초안 또는 상대방 안)', '계약 상대방과 주고받은 조건 메모', '특히 걱정되는 조항'],
  advisory: ['상황을 알 수 있는 자료(공문·기사·사내 문서)', '지금까지의 경과 메모', '답해야 하는 기한'],
  inheritance: ['돌아가신 분의 기본증명서·가족관계증명서(상세)', '돌아가신 날짜와 상속 사실을 안 날을 알 수 있는 자료', '알고 있는 재산과 빚 자료(부동산·예금·대출·카드·세금 고지서)', '함께 상속받는 가족의 이름과 연락처'],
  guardianship: ['후견이 필요한 분의 진단서·장애 관련 서류', '가족관계증명서', '후견이 필요한 분의 재산 목록', '다른 가족의 의견(동의서가 있으면 함께)'],
  name: ['기본증명서·가족관계증명서', '바꾸려는 이름과 그 이유', '이유를 뒷받침하는 자료(있다면)'],
  divorce: ['혼인관계증명서·가족관계증명서', '부부 재산 자료(부동산·예금·대출·연금)', '이혼·위자료 사유를 알 수 있는 자료(대화·사진·진단서 등)', '자녀 양육과 양육비에 관한 자료(판결·조서가 있으면 함께)'],
  license: ['운전면허 취소·정지 처분 통지서', '처분 통지를 받은 날짜', '운전이 생계에 필요하다는 자료(재직증명서·사업자등록증 등)', '사건 경위 메모'],
  school: ['학교·교육지원청에서 받은 통지서와 결정서', '사건 경위 메모와 관련 대화·사진', '학생의 평소 생활을 보여 주는 자료(생활기록·탄원서 등)'],
};

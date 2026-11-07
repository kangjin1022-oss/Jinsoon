import { useEffect, useRef, useState } from "react";
import { describeError, prepareImage, recognizeWine, type WineInfo } from "./lib/wine";
import { getApiKey, loadCellar, saveCellar, setApiKey, type CellarEntry } from "./lib/storage";

type Tab = "scan" | "cellar" | "settings";

export default function App() {
  const [tab, setTab] = useState<Tab>(getApiKey() ? "scan" : "settings");
  const [cellar, setCellar] = useState<CellarEntry[]>(loadCellar);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => saveCellar(cellar), [cellar]);

  const update = (id: string, patch: Partial<CellarEntry>) =>
    setCellar((c) => c.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const opened = cellar.find((e) => e.id === openId);

  return (
    <div className="app">
      <header className="topbar">
        <span className="logo">🍷</span> 와인 인식
      </header>
      <main>
        {opened ? (
          <EntryDetail
            entry={opened}
            onBack={() => setOpenId(null)}
            onChange={(p) => update(opened.id, p)}
            onDelete={() => {
              if (confirm("이 와인을 셀러에서 삭제할까요?")) {
                setCellar((c) => c.filter((e) => e.id !== opened.id));
                setOpenId(null);
              }
            }}
          />
        ) : tab === "scan" ? (
          <Scan
            onSaved={(entry) => {
              setCellar((c) => [entry, ...c]);
              setOpenId(entry.id);
              setTab("cellar");
            }}
            goSettings={() => setTab("settings")}
          />
        ) : tab === "cellar" ? (
          <Cellar entries={cellar} onOpen={setOpenId} />
        ) : (
          <Settings />
        )}
      </main>
      <nav className="tabbar">
        {(
          [
            ["scan", "📷", "인식"],
            ["cellar", "🗄️", `내 셀러 (${cellar.length})`],
            ["settings", "⚙️", "설정"],
          ] as const
        ).map(([t, icon, label]) => (
          <button
            key={t}
            className={tab === t && !opened ? "active" : ""}
            onClick={() => {
              setOpenId(null);
              setTab(t);
            }}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Scan({ onSaved, goSettings }: { onSaved: (e: CellarEntry) => void; goSettings: () => void }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ wine: WineInfo; thumb: string } | null>(null);

  async function handleFile(file?: File) {
    if (!file) return;
    const key = getApiKey();
    if (!key) {
      setError("먼저 설정에서 Anthropic API 키를 입력해 주세요.");
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const { base64, thumb } = await prepareImage(file);
      setPreview(`data:image/jpeg;base64,${base64}`);
      const wine = await recognizeWine(key, base64);
      setResult({ wine, thumb });
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="scan">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={galleryRef} type="file" accept="image/*" hidden
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />

      {!preview && (
        <div className="hero">
          <div className="hero-icon">🍾</div>
          <p>와인 라벨을 촬영하면<br />어떤 와인인지 알려드려요.</p>
        </div>
      )}
      {preview && <img className="preview" src={preview} alt="촬영한 와인" />}

      <div className="actions">
        <button className="primary" disabled={loading} onClick={() => cameraRef.current?.click()}>📷 라벨 촬영</button>
        <button disabled={loading} onClick={() => galleryRef.current?.click()}>🖼️ 앨범에서 선택</button>
      </div>

      {loading && <div className="loading"><div className="spinner" />라벨을 분석하는 중…</div>}
      {error && (
        <div className="error">
          {error}
          {!getApiKey() && <button className="link" onClick={goSettings}>설정으로 이동</button>}
        </div>
      )}
      {result && !result.wine.is_wine && <div className="error">사진에서 와인을 찾지 못했어요. 라벨이 잘 보이게 다시 찍어 주세요.</div>}
      {result && result.wine.is_wine && (
        <>
          <WineCard wine={result.wine} />
          <button className="primary wide" onClick={() =>
            onSaved({ id: crypto.randomUUID(), createdAt: Date.now(), thumb: result.thumb, wine: result.wine, rating: 0, memo: "" })
          }>🗄️ 내 셀러에 저장</button>
        </>
      )}
    </section>
  );
}

const typeColor: Record<string, string> = {
  레드: "#7b1e3a", 화이트: "#c9a227", 로제: "#e58fa3", 스파클링: "#9bb7c9", 디저트: "#b5651d", 주정강화: "#5c2a1d", 기타: "#777",
};

function Meter({ label, value }: { label: string; value: number }) {
  const v = Math.max(1, Math.min(5, value || 1));
  return (
    <div className="meter">
      <span>{label}</span>
      <div className="dots">{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= v ? "on" : ""} />)}</div>
    </div>
  );
}

function WineCard({ wine }: { wine: WineInfo }) {
  const rows: [string, string][] = [
    ["생산자", wine.producer], ["국가 / 지역", [wine.country, wine.region].filter(Boolean).join(" · ")],
    ["아펠라시옹", wine.appellation], ["품종", wine.grapes.join(", ")], ["알코올", wine.alcohol],
    ["서빙 온도", wine.serving_temp], ["음용 적기", wine.drinking_window], ["예상 가격", wine.price_range_krw],
  ];
  return (
    <article className="card">
      <div className="card-head">
        <span className="badge" style={{ background: typeColor[wine.type] ?? "#777" }}>{wine.type}</span>
        <span className={`conf conf-${wine.confidence}`}>신뢰도 {wine.confidence}</span>
      </div>
      <h2>{wine.name_ko || wine.name} {wine.vintage && <small>{wine.vintage}</small>}</h2>
      {wine.name_ko && wine.name !== wine.name_ko && <p className="orig">{wine.name}</p>}
      <dl>{rows.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <div className="meters">
        <Meter label="바디" value={wine.body} /><Meter label="당도" value={wine.sweetness} />
        <Meter label="산도" value={wine.acidity} /><Meter label="탄닌" value={wine.tannin} />
      </div>
      {wine.tasting_notes && <><h3>테이스팅 노트</h3><p>{wine.tasting_notes}</p></>}
      {wine.food_pairing.length > 0 && <><h3>추천 음식</h3><div className="chips">{wine.food_pairing.map((f) => <span key={f}>{f}</span>)}</div></>}
      {wine.notes && <p className="notes">ℹ️ {wine.notes}</p>}
    </article>
  );
}

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} className={i <= value ? "on" : ""} onClick={() => onChange(i === value ? 0 : i)} aria-label={`${i}점`}>★</button>
      ))}
    </div>
  );
}

function Cellar({ entries, onOpen }: { entries: CellarEntry[]; onOpen: (id: string) => void }) {
  const [q, setQ] = useState("");
  const filtered = entries.filter((e) =>
    [e.wine.name, e.wine.name_ko, e.wine.producer, e.wine.region, e.wine.country, ...e.wine.grapes, e.memo]
      .join(" ").toLowerCase().includes(q.toLowerCase()));
  if (entries.length === 0) return <div className="hero"><div className="hero-icon">🗄️</div><p>아직 저장한 와인이 없어요.</p></div>;
  return (
    <section>
      <input className="search" placeholder="이름, 생산자, 품종, 지역 검색" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="list">
        {filtered.map((e) => (
          <li key={e.id} onClick={() => onOpen(e.id)}>
            <img src={e.thumb} alt="" />
            <div>
              <strong>{e.wine.name_ko || e.wine.name}</strong>
              <span>{[e.wine.vintage, e.wine.type, e.wine.country].filter(Boolean).join(" · ")}</span>
              <span className="mini-stars">{"★".repeat(e.rating)}{"☆".repeat(5 - e.rating)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EntryDetail({ entry, onBack, onChange, onDelete }: {
  entry: CellarEntry; onBack: () => void; onChange: (p: Partial<CellarEntry>) => void; onDelete: () => void;
}) {
  return (
    <section>
      <button className="link back" onClick={onBack}>← 목록으로</button>
      <img className="preview" src={entry.thumb} alt="" />
      <WineCard wine={entry.wine} />
      <article className="card">
        <h3>내 평가</h3>
        <Stars value={entry.rating} onChange={(rating) => onChange({ rating })} />
        <textarea placeholder="함께 마신 사람, 장소, 느낌 등을 기록해 보세요" value={entry.memo}
          onChange={(e) => onChange({ memo: e.target.value })} />
        <p className="date">{new Date(entry.createdAt).toLocaleString("ko-KR")} 저장</p>
      </article>
      <button className="danger wide" onClick={onDelete}>삭제</button>
    </section>
  );
}

function Settings() {
  const [key, setKey] = useState(getApiKey());
  const [saved, setSaved] = useState(false);
  return (
    <section className="card">
      <h2>설정</h2>
      <label>Anthropic API 키</label>
      <input type="password" placeholder="sk-ant-..." value={key} autoComplete="off"
        onChange={(e) => { setKey(e.target.value); setSaved(false); }} />
      <button className="primary wide" onClick={() => { setApiKey(key); setSaved(true); }}>저장</button>
      {saved && <p className="ok">저장되었습니다.</p>}
      <p className="hint">
        키는 <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">Anthropic Console</a>에서
        발급받을 수 있어요. 키는 이 기기 브라우저에만 저장되며, 사진은 인식할 때만 Anthropic API로 전송됩니다.
      </p>
      <h3>앱으로 설치하기</h3>
      <p className="hint">
        <b>iPhone (Safari)</b>: 공유 버튼 → "홈 화면에 추가"<br />
        <b>Android (Chrome)</b>: 메뉴(⋮) → "앱 설치" 또는 "홈 화면에 추가"
      </p>
    </section>
  );
}

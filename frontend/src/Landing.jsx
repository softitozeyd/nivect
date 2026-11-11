import Action from "./Action";
import {
  ArrowUpRight,
  ArrowDown,
  ArrowRight,
  ScanLine,
  Focus,
  Layers,
  Plus,
  Minus,
  MoveUpRight,
  Pause,
  Play,
} from "lucide-react";
import { useEffect, useState } from "react";
import MotionVideo from "./MotionVideo";
export function Logo({ light = false }) {
  return (
    <span className={`logo ${light ? "light" : ""}`}>
      <span className="logo-mark">
        <i />
        <i />
        <i />
      </span>
      nivect
    </span>
  );
}
const faqs = [
  [
    "Nivect hangi kusurları tespit eder?",
    "İlk modelin kapsamı PET şişe, düşük dolum, eksik kapak ve gevşek kapaktır. Etiket, yabancı madde ve diğer şişe türleri bu modelin kapsamına dahil değildir.",
  ],
  [
    "PC kameramla başlayabilir miyim?",
    "Evet. Operasyon panelinde Kamera sekmesinden bilgisayarınızın kamerasını açabilirsiniz. Önizleme için kamera izni; tespit için eğitilmiş modelin yerel model servisine yüklenmesi gerekir.",
  ],
  [
    "Model hazır olmadan neler yapabilirim?",
    "Kamera önizlemesini, kayıt ekranını ve sistem bağlantılarını kullanabilirsiniz. Manuel test kayıtları ayrı bir kaynak olarak saklanır ve kamera üretim metriklerine karışmaz.",
  ],
  [
    "Gerçek üretime geçmek için ne gerekiyor?",
    "Kendi şişeleriniz, ışığınız ve kamera açınızla bağımsız test; kusur bazında eşik kalibrasyonu; yedekleme ve geri yükleme testi; TLS ve tesis erişim politikaları gerekir. Model eğitimi bu sürecin ilk adımıdır.",
  ],
];
export default function Landing({ onOpen }) {
  const [open, setOpen] = useState(0);
  const [motionPaused, setMotionPaused] = useState(
    () =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !!navigator.connection?.saveData,
  );
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionPaused(preference.matches);
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        }),
      {
        threshold: 0.1,
      },
    );
    document.querySelectorAll(".reveal").forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return (
    <div className="landing">
      <a href="#main" className="skip">
        İçeriğe geç
      </a>
      <section className="hero" id="top">
        <MotionVideo
          name="production-line"
          paused={motionPaused}
          hero
          className="hero-film"
        />
        <div className="hero-shade" />
        <header className="site-nav">
          <a href="#top" aria-label="Nivect ana sayfa">
            <Logo light />
          </a>
          <nav aria-label="Ana menü">
            <Action href="#approach" as="a" className="nav-link">
              Yaklaşım
            </Action>
            <Action href="#product" as="a" className="nav-link">
              Teknoloji
            </Action>
            <Action href="#questions" as="a" className="nav-link">
              Merak edilenler
            </Action>
          </nav>
          <Action className="nav-cta" onClick={onOpen}>
            Operasyon paneli <ArrowUpRight size={15} />
          </Action>
        </header>
        <div className="hero-copy">
          <div className="eyebrow light">
            <span className="status-dot" /> PET ŞİŞELER İÇİN GÖRSEL ZEKA
          </div>
          <h1>
            Her şişede.
            <br />
            <em>Aynı özen.</em>
          </h1>
          <p>
            Üretimin akışında kaybolan detayları görün.
            <br />
            Kaliteyi, ilk bakıştan son şişeye kadar koruyun.
          </p>
          <Action className="pill cream" onClick={onOpen}>
            Nivect’i keşfet <ArrowUpRight size={17} />
          </Action>
        </div>
        <div className="hero-bottom">
          <span>GÖR. ANLA. GÜVENLE ÜRET.</span>
          <Action href="#approach" as="a">
            Biraz daha yakından <ArrowDown size={16} />
          </Action>
          <span>
            01 — 03 <i />
          </span>
        </div>
        <div className="hero-caption">
          GERÇEK ÜRETİMİN RİTMİ.
          <br />
          <span>Her detay, bir sonraki şişede.</span>
        </div>
        <Action
          className="motion-toggle"
          onClick={() => setMotionPaused((p) => !p)}
          aria-label={motionPaused ? "Videoları oynat" : "Videoları duraklat"}
          aria-pressed={motionPaused}
        >
          {motionPaused ? <Play size={13} /> : <Pause size={13} />}
          <span>{motionPaused ? "Hareketi başlat" : "Hareketi duraklat"}</span>
        </Action>
      </section>
      <main id="main">
        <section className="intro section" id="approach">
          <div className="section-kicker reveal">
            <span>01 / DAHA YAKINDAN BAK</span>
            <span>İyi üretim, iyi gözlemle başlar.</span>
          </div>
          <h2 className="center-title reveal">
            <em>Küçük bir detay.</em>
            <br />
            Büyük bir fark.
          </h2>
          <p className="center-text reveal">
            Bir kapak. Bir dolum çizgisi. Bir anlık fark.
            <br />
            Nivect, PET şişelerinizi tek tek incelemek için tasarlandı.
          </p>
          <div className="feature-grid">
            <article className="feature-card card-scan reveal">
              <div className="scan-art">
                <MotionVideo
                  name="cap-detail"
                  paused={motionPaused}
                  className="detail-film"
                />
                <div className="scan-grid" />
                <div className="scan-bounds">
                  <span>DETAY / PET KAPAK</span>
                  <i />
                </div>
                <div className="scan-beam" />
              </div>
              <div className="feature-copy">
                <span className="micro">01 / GÖRSEL TESPİT</span>
                <h3>
                  Her şişeye
                  <br />
                  <em>dikkatle bakın.</em>
                </h3>
                <span className="feature-icon">
                  <Focus size={19} />
                </span>
              </div>
            </article>
            <article className="feature-card card-dark reveal">
              <div className="signal-art">
                <div className="signal-circle c1" />
                <div className="signal-circle c2" />
                <div className="signal-circle c3" />
                <ScanLine size={42} />
                <div className="signal-chip">MODEL → KARAR → KAYIT</div>
              </div>
              <div className="feature-copy">
                <span className="micro">02 / ANLAMLI KARARLAR</span>
                <h3>
                  Kusuru ayırın.
                  <br />
                  <em>Belirsizliği görün.</em>
                </h3>
                <span className="feature-icon">
                  <Layers size={19} />
                </span>
              </div>
            </article>
            <article className="feature-card card-check reveal">
              <div className="checks-art">
                {[
                  ["Dolum seviyesi", "underfill"],
                  ["Kapak varlığı", "missing_cap"],
                  ["Kapak konumu", "loose_cap"],
                ].map(([a, b], i) => (
                  <div className="check-row" key={b}>
                    <span className="check-num">0{i + 1}</span>
                    <span>
                      {a}
                      <small>{b}</small>
                    </span>
                    <span className="tiny-plus">+</span>
                  </div>
                ))}
              </div>
              <div className="feature-copy">
                <span className="micro">03 / PET ODAKLI KAPSAM</span>
                <h3>
                  Doğru kapsam.
                  <br />
                  <em>Net bir başlangıç.</em>
                </h3>
                <span className="feature-icon">
                  <ArrowUpRight size={19} />
                </span>
              </div>
            </article>
          </div>
        </section>
        <section className="product-section section" id="product">
          <div className="product-visual reveal">
            <MotionVideo
              name="single-bottle"
              paused={motionPaused}
              className="product-film"
            />
            <div className="product-film-shade" />{" "}
            <span className="visual-tag vt1">
              <span className="status-dot" /> KAPAK KONTROLÜ
            </span>
            <span className="visual-tag vt2">
              DOLUM ÇİZGİSİ <i />
            </span>
            <div className="visual-label">
              <span>N / VISION SYSTEM</span>
              <span>Gözlemin gücü.</span>
            </div>
          </div>
          <div className="product-copy reveal">
            <span className="micro">ÜRETİMİNİZLE AYNI RİTİMDE</span>
            <h2>
              Görünenden
              <br />
              <em>daha fazlası.</em>
            </h2>
            <p>
              Kamera görüntüsünden izlenebilir bir kayda. Şişelerinizin
              hikâyesi, tek bir çalışma alanında.
            </p>
            <div className="product-step">
              <span>01</span>
              <div>
                <h4>Kameranızı bağlayın</h4>
                <p>
                  PC kameranızla başlayın. Görüntüyü canlı izleyin, kontrol
                  alanını hazırlayın.
                </p>
              </div>
            </div>
            <div className="product-step">
              <span>02</span>
              <div>
                <h4>Modelinizle inceleyin</h4>
                <p>
                  Eğitilmiş PET modelini bağlayın. Düşük güvenli sonuçları
                  incelemeye ayırın.
                </p>
              </div>
            </div>
            <div className="product-step">
              <span>03</span>
              <div>
                <h4>Sonuçları takip edin</h4>
                <p>
                  Geçen, kusurlu ve inceleme bekleyen kayıtları filtreleyin;
                  verilerinizi dışa aktarın.
                </p>
              </div>
            </div>
            <Action className="pill dark" onClick={onOpen}>
              Çalışma alanını aç <ArrowUpRight size={17} />
            </Action>
          </div>
        </section>
        <section className="statement section reveal">
          <div className="statement-aside">
            Detayları görün,
            <br />
            <em>kaliteyi büyütün.</em>
          </div>
          <div>
            <h3>
              İnsan dikkatiyle başlayan kaliteyi,
              <br />
              görsel zekâyla sürdürülebilir hale getirin.
            </h3>
            <p>
              Önce kendi hattınızda öğrenen bir model. Sonra ölçülebilir,
              izlenebilir ve sizin kontrolünüzde bir süreç.
            </p>
            <div className="facts">
              <div>
                <strong>3</strong>
                <span>Odak kusur sınıfı</span>
              </div>
              <div>
                <strong>PC</strong>
                <span>Kamera ile başlangıç</span>
              </div>
              <div>
                <strong>1</strong>
                <span>Birleşik çalışma alanı</span>
              </div>
              <div>
                <strong>CSV</strong>
                <span>Taşınabilir kayıtlar</span>
              </div>
            </div>
            <Action className="text-link" onClick={onOpen}>
              Sistemi inceleyin <ArrowRight size={16} />
            </Action>
          </div>
        </section>
        <section className="quiet-banner reveal">
          <MotionVideo
            name="bottles-flow"
            paused={motionPaused}
            className="banner-film"
          />
          <div className="banner-film-shade" />
          <span className="micro">HER DETAYIN BİR DEĞERİ VAR.</span>
          <h2>
            Kalite bir sonuç değil.
            <br />
            <em>Her şişede verdiğiniz söz.</em>
          </h2>
          <Action className="pill cream" onClick={onOpen}>
            İlk bakışı atın <ArrowUpRight size={17} />
          </Action>
          <div className="banner-rings">
            <i />
            <i />
            <i />
          </div>
        </section>
        <section className="faq section" id="questions">
          <div className="faq-left reveal">
            <span className="micro">AKLINIZDA KALMASIN</span>
            <h2>
              <em>Merak</em> edilenler.
            </h2>
            <p>
              İlk bağlantıdan gerçek üretime.
              <br />
              Başlamak için bilmeniz gerekenler.
            </p>
            <div className="faq-emblem">
              <Logo />
              <span>BUILT FOR THE DETAILS.</span>
            </div>
          </div>
          <div className="faq-list reveal">
            {faqs.map(([q, a], i) => (
              <div className={`faq-item ${open === i ? "active" : ""}`} key={q}>
                <Action
                  aria-expanded={open === i}
                  aria-controls={`answer-${i}`}
                  onClick={() => setOpen(open === i ? -1 : i)}
                >
                  {q}
                  {open === i ? <Minus size={18} /> : <Plus size={18} />}
                </Action>
                <div id={`answer-${i}`} hidden={open !== i}>
                  <p>{a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="closing section reveal">
          <span className="micro">BİR SONRAKİ ŞİŞEYLE BAŞLAYIN.</span>
          <h2>
            Üretiminize yeni bir
            <br />
            <em>bakış açısı.</em>
          </h2>
          <Action className="pill dark" onClick={onOpen}>
            Nivect’e giriş yapın <ArrowUpRight size={17} />
          </Action>
        </section>
      </main>
      <footer className="footer">
        <a href="#top">
          <Logo />
        </a>
        <span>Görsel zekâ. Gerçek özen.</span>
        <span>© {new Date().getFullYear()} Nivect</span>
        <Action href="#top" as="a">
          Başa dön <MoveUpRight size={14} />
        </Action>
      </footer>
    </div>
  );
}

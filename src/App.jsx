import { lazy, Suspense, useEffect, useState, Component } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import Loader from "./components/Loader";

const SearchOverlay = lazy(() => import("./components/SearchOverlay"));
const Home = lazy(() => import("./pages/HomePreview"));
const LyricDetail = lazy(() => import("./pages/LyricDetail"));
const ArtistPage = lazy(() => import("./pages/ArtistPage"));
const AlbumPage = lazy(() => import("./pages/AlbumPage"));
const CollectionPage = lazy(() => import("./pages/CollectionPage"));
const MoodPage = lazy(() => import("./pages/MoodPage"));
const GenrePage = lazy(() => import("./pages/GenrePage"));
const DiscoverPage = lazy(() => import("./pages/DiscoverPage"));
const AlbumsPage = lazy(() => import("./pages/AlbumsPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const MusicListsPage = lazy(() => import("./pages/MusicListsPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
// The admin studio is a local editing tool — never part of the public build.
const AdminPage = import.meta.env.DEV ? lazy(() => import("./pages/AdminPage")) : null;

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", fontFamily: "monospace", background: "#fee", color: "#900", minHeight: "100vh" }}>
          <h2>Sayfa yüklenirken bir hata oluştu:</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{this.state.error?.stack || this.state.error?.toString()}</pre>
          <button onClick={() => window.location.reload()} style={{ padding: "10px 20px", marginTop: "20px" }}>Yeniden Yükle</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function RouteFallback() {
  return (
    <div className="route-fallback" aria-label="Sayfa yükleniyor">
      <div className="route-fallback-bar" />
      <div className="route-fallback-hero">
        <span />
        <strong />
        <em />
      </div>
      <div className="route-fallback-grid">
        {Array.from({ length: 6 }).map((_, index) => <i key={index} />)}
      </div>
    </div>
  );
}

export default function App() {

  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  // Scroll to top on route change — instant, so smooth-scroll CSS can't leave
  // the new page opened mid-way.
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, [location.pathname]);

  // Global ⌘K / Ctrl-K.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen((v) => !v); }
    };
    const onOpenSearch = () => setSearchOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("acupoflyrics:open-search", onOpenSearch);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("acupoflyrics:open-search", onOpenSearch);
    };
  }, []);

  return (
    <>
      <Loader />
      <Suspense fallback={<RouteFallback />}>
        {searchOpen && (
          <ErrorBoundary>
            <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
          </ErrorBoundary>
        )}
        <ErrorBoundary>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />

            {/* Songs — canonical pretty URL is /<slug>/; these are working aliases. */}
            <Route path="/song/:slug" element={<LyricDetail />} />
            <Route path="/ceviri/:slug" element={<LyricDetail />} />

            {/* Dedicated content-type pages. */}
            <Route path="/artist/:slug" element={<ArtistPage />} />
            <Route path="/sanatci/:slug" element={<ArtistPage />} />
            <Route path="/album/:slug" element={<AlbumPage />} />
            <Route path="/collection/:slug" element={<CollectionPage />} />
            <Route path="/mood/:slug" element={<MoodPage />} />
            <Route path="/genre/:slug" element={<GenrePage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/albumler" element={<AlbumsPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/listeler" element={<MusicListsPage />} />
            <Route path="/hakkimizda" element={<AboutPage />} />
            <Route path="/iletisim" element={<ContactPage />} />

            {/* Legacy aliases from earlier iterations. */}
            <Route path="/old-home" element={<Navigate to="/" replace />} />
            <Route path="/home-preview" element={<Navigate to="/" replace />} />
            <Route path="/kesfet" element={<Navigate to="/discover" replace />} />

            {AdminPage && <Route path="/admin" element={<AdminPage />} />}
            <Route path="/:slug" element={<LyricDetail />} />
          </Routes>
        </ErrorBoundary>
      </Suspense>
    </>
  );
}

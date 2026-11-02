import { useEffect, useId, useRef, useState } from 'react';
import { languageInfo } from '../lib/languages';

export default function SectionCardAction({ section, viewMode, languages, ui, onCreate }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const id = useId();
  const available = [languages.translation, languages.original].filter(language =>
    section[language === languages.original ? 'original' : 'translation'].some(Boolean));
  useEffect(() => { setOpen(false); }, [viewMode]);
  useEffect(() => {
    if (!open) return undefined;
    root.current?.querySelector('[role="menuitem"]')?.focus();
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  if (!available.length || (viewMode !== 'both' && !available.includes(viewMode))) return null;
  const create = language => { setOpen(false); trigger.current?.focus(); onCreate(section, language); };
  return <div className="detail-section-card-action" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={event => {
    if (!open) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const buttons = [...root.current.querySelectorAll('[role="menuitem"]')];
      const current = buttons.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.focus();
    }
  }}>
    <button ref={trigger} type="button" className="detail-card-icon" title={ui.createCard}
      aria-label={`${section.label} — ${ui.createCard}`} aria-haspopup={viewMode === 'both' ? 'menu' : undefined}
      aria-expanded={viewMode === 'both' ? open : undefined} aria-controls={open ? id : undefined}
      onClick={() => viewMode === 'both' ? setOpen(value => !value) : create(viewMode)}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 9h10M7 13h6M7 16h9"/></svg>
      <span>{ui.createCard}</span>
    </button>
    {open && <div id={id} className="detail-card-language-menu" role="menu" aria-label={ui.cardLanguage}>
      {available.map(language => <button key={language} type="button" role="menuitem" onClick={() => create(language)}>
        {languageInfo(language).short}
      </button>)}
    </div>}
  </div>;
}

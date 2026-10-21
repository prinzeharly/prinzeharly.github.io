/* =========================================================================
   PRINZE HARLY — interactions
   Vanilla JS, no dependencies. Every animation is transform / opacity /
   clip-path, and everything degrades to a working static page.
   ========================================================================= */
(() => {
    'use strict';

    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersReduced = () => reduceMotion.matches;
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    /* ---------------------------------------------------------------
       1. Page entrance — wait for the type (max 700 ms), then play once
       --------------------------------------------------------------- */
    const startEntrance = () => requestAnimationFrame(() => root.classList.add('is-loaded'));
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise(r => setTimeout(r, 700))]).then(startEntrance);

    /* ---------------------------------------------------------------
       2. Scroll reveals
       --------------------------------------------------------------- */
    const revealEls = $$('[data-reveal], [data-reveal-line]');

    if (!('IntersectionObserver' in window) || prefersReduced()) {
        revealEls.forEach(el => el.classList.add('is-in'));
    } else {
        // Elements revealed with clip-path are invisible to IntersectionObserver
        // while fully clipped, so watch an unclipped stand-in (their parent).
        const watched = new Map();
        const io = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                (watched.get(entry.target) || []).forEach(el => el.classList.add('is-in'));
                io.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
        revealEls.forEach(el => {
            const clipped = el.matches('.frame, .film__frame, [data-reveal-line]');
            const target = clipped ? el.parentElement : el;
            if (!watched.has(target)) watched.set(target, []);
            watched.get(target).push(el);
            io.observe(target);
        });
    }

    /* ---------------------------------------------------------------
       3. Parallax — images drift inside their fixed frames only
       --------------------------------------------------------------- */
    const parallaxEls = $$('[data-parallax]');
    let parallaxActive = new Set();
    let ticking = false;

    const updateParallax = () => {
        ticking = false;
        if (prefersReduced()) return;
        const vh = window.innerHeight;
        parallaxActive.forEach(el => {
            const frame = el.parentElement;
            const rect = frame.getBoundingClientRect();
            const amount = parseFloat(el.dataset.parallax) || 0.05;
            // -1 when the frame's centre is at the bottom of the viewport, +1 at the top
            const progress = ((rect.top + rect.height / 2) - vh / 2) / (vh / 2 + rect.height / 2);
            const shift = Math.max(-1, Math.min(1, progress)) * amount * rect.height;
            el.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0)`;
        });
    };
    const requestParallax = () => {
        if (!ticking) { ticking = true; requestAnimationFrame(updateParallax); }
    };

    if ('IntersectionObserver' in window && parallaxEls.length) {
        const pio = new IntersectionObserver(entries => {
            entries.forEach(e => {
                const el = e.target.querySelector('[data-parallax]') || e.target;
                if (e.isIntersecting) parallaxActive.add(el); else parallaxActive.delete(el);
            });
            requestParallax();
        }, { rootMargin: '10% 0px' });
        parallaxEls.forEach(el => pio.observe(el.parentElement));
        window.addEventListener('scroll', requestParallax, { passive: true });
        window.addEventListener('resize', requestParallax);
    }
    reduceMotion.addEventListener?.('change', () => {
        if (prefersReduced()) parallaxEls.forEach(el => (el.style.transform = ''));
        else requestParallax();
    });

    /* ---------------------------------------------------------------
       4. Navigation — current section indicator
       --------------------------------------------------------------- */
    const navLinks = $$('[data-nav]');
    if ('IntersectionObserver' in window && navLinks.length) {
        const sections = navLinks.map(a => document.getElementById(a.dataset.nav)).filter(Boolean);
        const visible = new Map();
        const nio = new IntersectionObserver(entries => {
            entries.forEach(e => visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0));
            let current = null, best = 0;
            visible.forEach((ratio, id) => { if (ratio > best) { best = ratio; current = id; } });
            navLinks.forEach(a => {
                if (a.dataset.nav === current) a.setAttribute('aria-current', 'true');
                else a.removeAttribute('aria-current');
            });
        }, { rootMargin: '-35% 0px -45% 0px', threshold: [0, 0.01, 0.25, 0.5, 1] });
        sections.forEach(s => nio.observe(s));
    }

    /* ---------------------------------------------------------------
       5. Mobile menu
       --------------------------------------------------------------- */
    const menu = $('[data-menu]');
    const toggle = $('[data-menu-toggle]');
    const toggleLabel = $('[data-menu-label]');
    const main = $('#main');

    const setMenu = open => {
        if (!menu || !toggle) return;
        toggle.setAttribute('aria-expanded', String(open));
        toggleLabel.textContent = open ? 'Close' : 'Menu';
        if (open) {
            menu.hidden = false;
            menu.getBoundingClientRect(); // commit the closed state before animating
            menu.classList.add('is-open');
            main.inert = true;
            lockScroll(true);
            setTimeout(() => $('a', menu)?.focus({ preventScroll: true }), prefersReduced() ? 0 : 250);
        } else {
            menu.classList.remove('is-open');
            main.inert = false;
            lockScroll(false);
            const done = () => { if (!menu.classList.contains('is-open')) menu.hidden = true; };
            prefersReduced() ? done() : setTimeout(done, 600);
        }
    };
    toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    menu?.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
            setMenu(false);
            toggle.focus();
        }
    });
    window.matchMedia('(min-width: 768px)').addEventListener?.('change', e => { if (e.matches) setMenu(false); });

    /* ---------------------------------------------------------------
       Scroll lock (shared by menu + viewer)
       --------------------------------------------------------------- */
    let lockCount = 0;
    function lockScroll(lock) {
        lockCount = Math.max(0, lockCount + (lock ? 1 : -1));
        if (lockCount > 0) {
            const sbw = window.innerWidth - root.clientWidth;
            root.style.overflow = 'hidden';
            if (sbw > 0) root.style.paddingRight = sbw + 'px';
        } else {
            root.style.overflow = '';
            root.style.paddingRight = '';
        }
    }

    /* ---------------------------------------------------------------
       6. Viewer — photos and films open from their own frame
       --------------------------------------------------------------- */
    const dialog = $('[data-viewer-dialog]');
    const triggers = $$('[data-viewer]');

    if (dialog && typeof dialog.showModal === 'function' && triggers.length) {
        const stage = $('[data-viewer-stage]', dialog);
        const poster = $('[data-viewer-poster]', dialog);
        const player = $('[data-viewer-player]', dialog);
        const titleEl = $('[data-viewer-title]', dialog);
        const metaEl = $('[data-viewer-meta]', dialog);
        const ytLink = $('[data-viewer-yt]', dialog);
        const closeBtn = $('[data-viewer-close]', dialog);
        const bg = $('[data-viewer-bg]', dialog);

        let activeTrigger = null;
        let ratio = 16 / 9;
        let busy = false;
        let openAnim = null;
        const EASE = 'cubic-bezier(0.7, 0, 0.2, 1)';

        const fitStage = () => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const margin = parseFloat(getComputedStyle(root).getPropertyValue('--margin')) || 24;
            const maxW = vw - margin * 2;
            const maxH = vh - 72 - 28 - 18 - 92; // top pad, bottom pad, gap, caption
            let w = Math.min(maxW, maxH * ratio);
            let h = w / ratio;
            dialog.style.setProperty('--stage-w', `${Math.round(w)}px`);
            dialog.style.setProperty('--stage-h', `${Math.round(h)}px`);
        };

        // The transform + clip that makes the stage sit exactly over the source frame
        // (a "cover" crop, matching how the thumbnail is cropped on the page).
        const sourceState = source => {
            const s = source.getBoundingClientRect();
            const f = stage.getBoundingClientRect();
            const scale = Math.max(s.width / f.width, s.height / f.height);
            const sw = f.width * scale;
            const sh = f.height * scale;
            const dx = s.left - (sw - s.width) / 2 - f.left;
            const dy = s.top - (sh - s.height) / 2 - f.top;
            const insetX = ((sw - s.width) / 2) / scale;
            const insetY = ((sh - s.height) / 2) / scale;
            return {
                transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
                clipPath: `inset(${insetY}px ${insetX}px ${insetY}px ${insetX}px)`
            };
        };
        const finalState = { transform: 'translate(0px, 0px) scale(1)', clipPath: 'inset(0px 0px 0px 0px)' };

        const renderMeta = meta => {
            metaEl.textContent = '';
            meta.split('·').map(s => s.trim()).filter(Boolean).forEach(part => {
                const span = document.createElement('span');
                span.textContent = part;
                metaEl.appendChild(span);
            });
        };

        const mountFilm = id => {
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1&modestbranding=1`;
            iframe.title = `${titleEl.textContent} — video player`;
            iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
            iframe.allowFullscreen = true;
            iframe.referrerPolicy = 'strict-origin-when-cross-origin';
            iframe.addEventListener('load', () => iframe.classList.add('is-ready'), { once: true });
            player.appendChild(iframe);
        };

        const open = trigger => {
            if (busy || dialog.open) return;
            busy = true;
            activeTrigger = trigger;
            const type = trigger.dataset.viewer;
            const thumb = trigger.querySelector('img');

            ratio = type === 'film' ? 16 / 9 : (parseFloat(trigger.dataset.ratio) || (thumb.naturalWidth / thumb.naturalHeight) || 1.5);
            titleEl.textContent = trigger.dataset.title || '';
            renderMeta(trigger.dataset.meta || '');
            dialog.dataset.type = type;
            dialog.setAttribute('aria-label', `${type === 'film' ? 'Film' : 'Photograph'}: ${trigger.dataset.title}`);

            if (type === 'film') {
                ytLink.hidden = false;
                ytLink.href = trigger.href;
            } else {
                ytLink.hidden = true;
            }

            poster.src = thumb.currentSrc || thumb.src;
            poster.alt = type === 'film' ? '' : thumb.alt;
            player.textContent = '';

            fitStage();
            lockScroll(true);
            dialog.showModal();
            closeBtn.focus({ preventScroll: true });

            const afterOpen = () => {
                busy = false;
                dialog.classList.add('is-settled');
                if (type === 'film') {
                    mountFilm(trigger.dataset.video);
                } else if (trigger.dataset.full) {
                    // swap in the full-resolution file once it has loaded
                    const hi = new Image();
                    hi.onload = () => { if (dialog.open && activeTrigger === trigger) poster.src = hi.src; };
                    hi.src = trigger.dataset.full;
                }
            };

            requestAnimationFrame(() => {
                dialog.classList.add('is-open');
                if (prefersReduced()) { afterOpen(); return; }
                const from = sourceState(trigger);
                openAnim = stage.animate([from, finalState], { duration: 750, easing: EASE, fill: 'both' });
                openAnim.onfinish = afterOpen;
            });
        };

        const close = () => {
            if (!dialog.open || busy) return;
            busy = true;
            player.textContent = ''; // removing the iframe stops playback
            dialog.classList.remove('is-settled');
            dialog.classList.remove('is-open');

            const finish = () => {
                openAnim?.cancel();
                stage.getAnimations().forEach(a => a.cancel());
                dialog.close();
                lockScroll(false);
                activeTrigger?.focus({ preventScroll: true });
                busy = false;
            };

            if (prefersReduced() || !activeTrigger) { setTimeout(finish, 200); return; }
            const to = sourceState(activeTrigger);
            const anim = stage.animate([finalState, to], { duration: 620, easing: EASE, fill: 'both' });
            anim.onfinish = finish;
        };

        triggers.forEach(t => t.addEventListener('click', e => {
            // allow open-in-new-tab with modifier keys
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            open(t);
        }));

        closeBtn.addEventListener('click', close);
        bg.addEventListener('click', close);
        $('.viewer__layout', dialog).addEventListener('click', e => {
            if (e.target === e.currentTarget) close();
        });
        dialog.addEventListener('cancel', e => { e.preventDefault(); close(); }); // Escape key
        window.addEventListener('resize', () => {
            if (!dialog.open) return;
            fitStage();
        });
    }

    /* ---------------------------------------------------------------
       7. Copy email
       --------------------------------------------------------------- */
    const copyBtn = $('[data-copy]');
    const copyLabel = $('[data-copy-label]');
    const copyStatus = $('[data-copy-status]');
    let copyTimer;
    copyBtn?.addEventListener('click', async () => {
        const text = copyBtn.dataset.copy;
        let ok = false;
        try {
            await navigator.clipboard.writeText(text);
            ok = true;
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { ok = document.execCommand('copy'); } catch { ok = false; }
            ta.remove();
        }
        copyLabel.textContent = ok ? 'Copied' : 'Press Ctrl+C to copy';
        copyStatus.textContent = ok ? 'Email address copied to clipboard' : '';
        copyBtn.classList.toggle('is-done', ok);
        clearTimeout(copyTimer);
        copyTimer = setTimeout(() => {
            copyLabel.textContent = 'Copy address';
            copyBtn.classList.remove('is-done');
            copyStatus.textContent = '';
        }, 2200);
    });
})();

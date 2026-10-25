import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);

// Hidden start states for group reveals exist only once this module is running, so content is never stranded invisible.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('reveal-ready');

const STAGE_QUERY = '(min-width: 1024px) and (prefers-reduced-motion: no-preference)';
const stageMQ = matchMedia(STAGE_QUERY);
const stageOn = stageMQ.matches;
// The pinned scene and the stacked layout are different DOM trees, so switching needs a reload.
stageMQ.addEventListener('change', () => location.reload());

const mm = gsap.matchMedia();

/** Sound ring: reacts to the pointer and to scroll speed, never on its own. */
function initBars(root: Element, lenis: Lenis, cleanups: Array<() => void>) {
	const moon = root.querySelector<HTMLElement>('[data-moon]');
	const bars = Array.from(root.querySelectorAll<SVGLineElement>('[data-bar]'));
	if (!moon || !bars.length) return;
	const n = bars.length;
	const base = bars.map((b) => parseFloat(b.dataset.len ?? '8'));
	const cur = [...base];
	let pointer = { a: 0, power: 0 };
	const onMove = (e: PointerEvent) => {
		const r = moon.getBoundingClientRect();
		pointer = { a: Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) + Math.PI / 2, power: 1 };
	};
	window.addEventListener('pointermove', onMove, { passive: true });
	let settled = true;
	const render = () => {
		const v = Math.min(1, Math.abs(lenis.velocity) / 30);
		if (settled && pointer.power < 0.01 && v < 0.01) return;
		pointer.power *= 0.96;
		let moved = 0;
		const a0 = ((pointer.a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
		for (let i = 0; i < n; i++) {
			let d = Math.abs((i / n) * Math.PI * 2 - a0);
			d = Math.min(d, Math.PI * 2 - d);
			const bump = Math.exp(-((d / 0.55) ** 2)) * 46 * pointer.power + v * 20 * Math.abs(Math.sin(i * 0.9));
			const next = cur[i] + (base[i] + bump - cur[i]) * 0.18;
			if (Math.abs(next - cur[i]) > 0.02) {
				cur[i] = next;
				bars[i].setAttribute('y2', String(236 - next));
				moved++;
			}
		}
		settled = moved === 0;
	};
	gsap.ticker.add(render);
	cleanups.push(() => {
		window.removeEventListener('pointermove', onMove);
		gsap.ticker.remove(render);
	});
}

/** The pinned scene: one viewport, one scrubbed timeline, no sense of scrolling down. */
function initStage(lenis: Lenis, cleanups: Array<() => void>) {
	const stage = document.querySelector<HTMLElement>('[data-stage]');
	if (!stage) return;
	const $ = <T extends Element = HTMLElement>(s: string) => stage.querySelector<T>(s)!;
	const $$ = <T extends Element = HTMLElement>(s: string) => Array.from(stage.querySelectorAll<T>(s));

	const moon = $('[data-moon]');
	const frame = $('[data-stage-frame]');
	const box = $('[data-stage-box]');
	const title = $('[data-stage-title]');
	const fade = $('[data-hero-fade]');
	const shots = $$('[data-shot]');
	const featurePanels = $$('[data-panel][data-kind="feature"]');
	const shotPanels = $$('[data-panel][data-kind="shot"]');

	// Intro on load (kept on child elements so the scrubbed timeline owns the wrappers).
	gsap
		.timeline({ defaults: { ease: 'expo.out' } })
		.from($$('.hero-line'), { yPercent: 115, duration: 1.3, stagger: 0.12 })
		.from($$('.hero-in'), { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, 0.5)
		.from($('[data-moon] svg'), { scale: 0.82, opacity: 0, duration: 1.8, transformOrigin: '50% 50%' }, 0)
		.from($$('[data-star]'), { scale: 0, transformOrigin: '50% 50%', duration: 0.8, stagger: 0.07, ease: 'back.out(2)' }, 0.8);

	const orbits = [
		gsap.to($$('[data-orbit="cw"]'), { rotation: 360, svgOrigin: '400 400', duration: 160, ease: 'none', repeat: -1, paused: true }),
		gsap.to($$('[data-orbit="ccw"]'), { rotation: -360, svgOrigin: '400 400', duration: 220, ease: 'none', repeat: -1, paused: true }),
	];
	// Ambient motion only runs while the pinned scene is on screen and the moon is still visible.
	ScrollTrigger.create({
		trigger: stage,
		start: 'top bottom',
		end: 'top+=1400 top',
		onToggle: (self) => orbits.forEach((o) => (self.isActive ? o.play() : o.pause())),
	});
	initBars(stage, lenis, cleanups);

	// Window follows the pointer in 3D. Transform-only, so it stays on the compositor.
	const tilt = $('[data-tilt]');
	const rx = gsap.quickTo(tilt, 'rotationX', { duration: 0.8, ease: 'power3.out' });
	const ry = gsap.quickTo(tilt, 'rotationY', { duration: 0.8, ease: 'power3.out' });
	gsap.set(tilt, { transformPerspective: 1400, transformOrigin: '50% 50%' });
	const onTilt = (e: PointerEvent) => {
		ry((e.clientX / innerWidth - 0.5) * 7);
		rx(-(e.clientY / innerHeight - 0.5) * 5);
	};
	window.addEventListener('pointermove', onTilt, { passive: true });
	cleanups.push(() => window.removeEventListener('pointermove', onTilt));

	const UNIT = 0.8; // viewport heights of scroll per timeline unit
	const FEATURE_SCALE = 0.62;
	const shiftX = () => (box.clientWidth - 48 - frame.offsetWidth * FEATURE_SCALE) / 2;

	const tl = gsap.timeline({
		defaults: { ease: 'none' },
		scrollTrigger: {
			trigger: stage,
			start: 'top top',
			end: () => '+=' + Math.round(innerHeight * UNIT * tl.duration()),
			pin: true,
			scrub: true,
			anticipatePin: 1,
			invalidateOnRefresh: true,
		},
	});

	// Act 1 to 2: the title splits apart, the camera dives through the moon, the window arrives.
	tl.to($('[data-line-a]'), { xPercent: -28, duration: 1 }, 0)
		.to($('[data-line-b]'), { xPercent: 28, duration: 1 }, 0)
		.to(title, { opacity: 0, duration: 0.8 }, 0.2)
		.to(fade, { opacity: 0, y: -50, duration: 0.6 }, 0)
		.to(moon, { scale: 2.2, rotation: 25, duration: 1 }, 0)
		.to(moon, { scale: 4.6, opacity: 0, duration: 1.1 }, 1)
		.to($$('[data-star]'), { y: (i: number) => -90 - (i % 4) * 45, duration: 2 }, 0)
		.fromTo(frame, { scale: 0.3, opacity: 0, y: 70 }, { scale: 1, opacity: 1, y: 0, duration: 1.2 }, 0.8);

	// Act 3: the window steps aside and each feature takes the stage in turn.
	const F0 = 2.9;
	tl.addLabel('features', F0 - 0.3)
		.to(frame, { scale: FEATURE_SCALE, x: shiftX, duration: 0.9 }, F0 - 0.8);
	featurePanels.forEach((panel, i) => {
		const t = F0 + i;
		const paths = panel.querySelectorAll('[data-draw]');
		tl.fromTo(panel, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.35 }, t)
			.fromTo(paths, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.5, stagger: 0.08 }, t + 0.05)
			.to(panel, { opacity: 0, y: -50, duration: 0.3 }, t + 0.7);
	});

	// Act 4: the window shows the real app, one screenshot per step.
	const S0 = F0 + featurePanels.length;
	tl.addLabel('showcase', S0 - 0.3);
	shotPanels.forEach((panel, j) => {
		const t = S0 + j;
		tl.fromTo(panel, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.35 }, t);
		if (j > 0) tl.to(shots[j - 1], { opacity: 0, duration: 0.4 }, t).to(shots[j], { opacity: 1, duration: 0.4 }, t);
		if (j < shotPanels.length - 1) tl.to(panel, { opacity: 0, y: -50, duration: 0.3 }, t + 0.7);
	});
	const end = S0 + shotPanels.length;
	tl.to(shotPanels[shotPanels.length - 1], { opacity: 0, y: -50, duration: 0.3 }, end - 0.1)
		.to(frame, { scale: 0.5, opacity: 0, y: -60, duration: 0.5 }, end - 0.1)
		.to({}, { duration: 0.2 }, end + 0.4);
	tl.fromTo($('[data-stage-progress]'), { scaleX: 0 }, { scaleX: 1, duration: tl.duration(), ease: 'none' }, 0);

	// Header links jump to a scene of the pinned timeline instead of an element.
	const st = tl.scrollTrigger!;
	const goTo = (label: string) => {
		const progress = tl.labels[label] / tl.duration();
		lenis.scrollTo(st.start + progress * (st.end - st.start), { duration: 1.6 });
	};
	const onClick = (e: MouseEvent) => {
		const a = (e.target as Element).closest<HTMLAnchorElement>('a[href$="#features"], a[href$="#showcase"]');
		if (!a) return;
		e.preventDefault();
		goTo(a.getAttribute('href')!.endsWith('#features') ? 'features' : 'showcase');
	};
	document.addEventListener('click', onClick);
	cleanups.push(() => document.removeEventListener('click', onClick));
}

/** Stacked layout (phones, tablets): lighter scroll-linked hero. */
function initClassicHero(lenis: Lenis, cleanups: Array<() => void>) {
	const hero = document.querySelector('[data-hero]');
	if (!hero) return;
	gsap
		.timeline({ defaults: { ease: 'expo.out' } })
		.from(hero.querySelectorAll('.hero-line'), { yPercent: 115, duration: 1.3, stagger: 0.12 })
		.from(hero.querySelectorAll('.hero-in'), { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, 0.5)
		.from(hero.querySelectorAll('[data-moon] svg'), { scale: 0.82, opacity: 0, duration: 1.8, transformOrigin: '50% 50%' }, 0)
		.from(hero.querySelectorAll('[data-star]'), { scale: 0, transformOrigin: '50% 50%', duration: 0.8, stagger: 0.07, ease: 'back.out(2)' }, 0.8);
	gsap.to(hero.querySelector('[data-moon]'), { rotation: 24, scale: 1.12, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
	gsap.fromTo(hero.querySelector('[data-hero-window]'), { scale: 0.9, yPercent: 8 }, { scale: 1, yPercent: 0, ease: 'none', scrollTrigger: { trigger: hero.querySelector('[data-hero-window]'), start: 'top 100%', end: 'top 40%', scrub: true } });
	gsap.to(hero.querySelectorAll('[data-orbit="cw"]'), { rotation: 360, svgOrigin: '400 400', duration: 160, ease: 'none', repeat: -1 });
	gsap.to(hero.querySelectorAll('[data-orbit="ccw"]'), { rotation: -360, svgOrigin: '400 400', duration: 220, ease: 'none', repeat: -1 });
	initBars(hero, lenis, cleanups);
}

mm.add('(prefers-reduced-motion: no-preference)', () => {
	const cleanups: Array<() => void> = [];

	// Smooth scroll, kept in step with ScrollTrigger.
	const lenis = new Lenis({ anchors: true, lerp: 0.1 });
	lenis.on('scroll', ScrollTrigger.update);
	const tick = (time: number) => lenis.raf(time * 1000);
	gsap.ticker.add(tick);
	gsap.ticker.lagSmoothing(0);

	if (stageOn) initStage(lenis, cleanups);
	else initClassicHero(lenis, cleanups);

	// Header tucks away while scrolling down and returns on the way up.
	const header = document.querySelector<HTMLElement>('[data-header]');
	if (header) {
		const hide = gsap.to(header, { yPercent: -140, duration: 0.45, ease: 'power3.out', paused: true });
		ScrollTrigger.create({
			start: 0,
			end: 'max',
			onUpdate: (self) => {
				if (self.direction === 1 && self.scroll() > 160) hide.play();
				else if (self.direction === -1) hide.reverse();
			},
		});
		cleanups.push(() => gsap.set(header, { clearProps: 'transform' }));
	}

	// Magnetic buttons.
	gsap.utils.toArray<HTMLElement>('[data-magnetic]').forEach((el) => {
		const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
		const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
		el.addEventListener('pointermove', (e) => {
			const r = el.getBoundingClientRect();
			x((e.clientX - (r.left + r.width / 2)) * 0.25);
			y((e.clientY - (r.top + r.height / 2)) * 0.25);
		});
		el.addEventListener('pointerleave', () => { x(0); y(0); });
	});

	// Single elements
	gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
		gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
	});

	// Feature illustrations (stacked layout) draw themselves when their row arrives, and again on hover.
	gsap.utils.toArray<HTMLElement>('[data-feature]').forEach((row) => {
		const paths = row.querySelectorAll('[data-draw]');
		gsap.from(paths, { drawSVG: '0%', duration: 1.3, stagger: 0.12, ease: 'power2.inOut', scrollTrigger: { trigger: row, start: 'top 85%', once: true } });
		row.addEventListener('pointerenter', () => gsap.fromTo(paths, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.9, stagger: 0.08, ease: 'power2.inOut', overwrite: 'auto' }));
	});

	// Parallax: data-parallax="<factor>"
	gsap.utils.toArray<HTMLElement | SVGElement>('[data-parallax]').forEach((el) => {
		const factor = parseFloat(el.getAttribute('data-parallax') ?? '0');
		gsap.to(el, { y: () => factor * 300, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
	});

	// Footer wordmark rises into view.
	gsap.fromTo('[data-wordmark]', { yPercent: 45 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: document.querySelector('[data-wordmark]')?.parentElement, start: 'top 100%', end: 'bottom bottom', scrub: true } });

	return () => {
		cleanups.forEach((fn) => fn());
		gsap.ticker.remove(tick);
		lenis.destroy();
	};
});

// Staggered groups are driven by CSS (see global.css); GSAP only flips the trigger on the wrapper.
gsap.utils.toArray<HTMLElement>('[data-reveal-group]').forEach((group) => {
	ScrollTrigger.create({ trigger: group, start: 'top 88%', once: true, onEnter: () => group.setAttribute('data-inview', '') });
});

// Showcase (stacked layout): crossfade screenshots as each step reaches the viewport centre.
const screens = gsap.utils.toArray<HTMLElement>('[data-story-screen]');
const steps = gsap.utils.toArray<HTMLElement>('[data-story-step]');
if (screens.length && steps.length) {
	const show = (index: number) => {
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		screens.forEach((s, i) => gsap.to(s, { opacity: i === index ? 1 : 0, duration: reduce ? 0 : 0.5, ease: 'power2.out', overwrite: true }));
	};
	steps.forEach((step, i) => {
		ScrollTrigger.create({ trigger: step, start: 'top 55%', end: 'bottom 55%', onToggle: (self) => self.isActive && show(i) });
	});
}

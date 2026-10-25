"use client"

import { useMemo, useState } from "react"
import { ArrowUpRight, Check, Copy, Search } from "lucide-react"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NumberTicker } from "@/components/ui/number-ticker"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Marquee } from "@/components/ui/marquee"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type CatalogItem = { slug: string; title: string }
type Source = "all" | "shadcn" | "magic"

const shadcnComponents: CatalogItem[] = "accordion alert alert-dialog aspect-ratio attachment avatar badge breadcrumb bubble button button-group calendar card carousel chart checkbox code-block collapsible combobox command context-menu dialog direction drawer dropdown-menu empty field hover-card input input-group input-otp item kbd label marker menubar message message-scroller native-select navigation-menu pagination popover progress questionnaire radio-group resizable scroll-area select separator sheet sidebar skeleton slider spinner switch table tabs textarea toast toggle toggle-group tooltip trace".split(" ").map((slug) => ({ slug, title: slug.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) }))

const magicComponents: CatalogItem[] = "magic-card android warp-background line-shadow-text aurora-text morphing-text scroll-progress lens pointer smooth-cursor progressive-blur neon-gradient-card meteors grid-pattern striped-pattern interactive-grid-pattern dot-pattern flickering-grid hero-video-dialog code-comparison marquee glyph-matrix globe shimmer-button tweet-card client-tweet-card bento-grid particles number-ticker ripple retro-grid animated-list animated-shiny-text animated-grid-pattern border-beam animated-beam text-reveal hyper-text animated-gradient-text orbiting-circles dock word-rotate avatar-circles typing-animation sparkles-text spinning-text comic-text icon-cloud text-animate scroll-based-velocity shiny-button shine-border animated-circular-progress-bar confetti cool-mode pulsating-button ripple-button file-tree blur-fade safari rainbow-button interactive-hover-button terminal video-text pixel-image highlighter animated-theme-toggler".split(" ").map((slug) => ({ slug, title: slug.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) }))

function SectionHeading({
	index,
	title,
	description,
}: {
	index: string
	title: string
	description: string
}) {
	return (
		<div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground">{index}</p>
				<h2 className="mt-1 text-xl font-semibold tracking-[-0.035em] sm:text-2xl">{title}</h2>
			</div>
			<p className="max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
		</div>
	)
}

function DemoFrame({
	label,
	children,
	className = "",
}: {
	label: string
	children: React.ReactNode
	className?: string
}) {
	return (
		<div className={`min-w-0 squircle-3xl border border-line bg-surface p-5 sm:p-6 ${className}`}>
			<div className="mb-5 flex items-center justify-between gap-3">
				<p className="text-sm font-medium">{label}</p>
				<span className="rounded-full border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Live</span>
			</div>
			{children}
		</div>
	)
}

export function ComponentGallery() {
	const [query, setQuery] = useState("")
	const [source, setSource] = useState<Source>("all")
	const [copied, setCopied] = useState("")
	const [sliderValue, setSliderValue] = useState([42])
	const [actionMessage, setActionMessage] = useState("")
	const [published, setPublished] = useState(false)
	const [dialogOpen, setDialogOpen] = useState(false)

	const filteredShadcn = useMemo(
		() => shadcnComponents.filter((item) => source !== "magic" && item.title.toLowerCase().includes(query.toLowerCase())),
		[query, source],
	)
	const filteredMagic = useMemo(
		() => magicComponents.filter((item) => source !== "shadcn" && item.title.toLowerCase().includes(query.toLowerCase())),
		[query, source],
	)

	async function copyPath(item: CatalogItem, isMagic: boolean) {
		const directory = isMagic && item.slug === "striped-pattern" ? "magicui" : "ui"
		const path = `@/components/${directory}/${item.slug}`
		try {
			await navigator.clipboard.writeText(path)
			setCopied(item.slug)
			window.setTimeout(() => setCopied(""), 1800)
		} catch {
			setCopied("")
		}
	}

	return (
		<TooltipProvider>
			<main className="mx-auto w-full max-w-[1440px] px-5 pb-16 sm:px-8 lg:px-12">
				<header className="border-b border-line py-10 sm:py-14">
					<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
						<a href="/" className="transition-colors hover:text-foreground">LunoRX</a>
						<span aria-hidden="true">/</span><span>UI library</span>
						<span className="ml-auto inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[10px] tracking-wide">
							<span className="size-1.5 rounded-full bg-foreground" /> READY TO USE
						</span>
					</div>
					<div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.56fr] lg:items-end">
						<div>
							<h1 className="max-w-3xl text-[clamp(2.75rem,6vw,5.25rem)] font-semibold leading-[0.99] tracking-[-0.055em] text-balance">The LunoRX<br className="hidden sm:block" /> component library.</h1>
							<p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">A working catalog of the shared interface primitives and motion components. Try the examples, filter the library, then copy a component path into your page.</p>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="squircle-3xl border border-line bg-surface p-4 sm:p-5">
								<p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Base UI · shadcn</p>
								<p className="mt-2 text-3xl font-semibold tracking-tight"><NumberTicker value={shadcnComponents.length} className="text-foreground tracking-tight" /></p>
								<p className="mt-1 text-xs text-muted-foreground">components available</p>
							</div>
							<div className="squircle-3xl border border-line bg-surface p-4 sm:p-5">
								<p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Magic UI</p>
								<p className="mt-2 text-3xl font-semibold tracking-tight"><NumberTicker value={magicComponents.length} className="text-foreground tracking-tight" /></p>
								<p className="mt-1 text-xs text-muted-foreground">components available</p>
							</div>
						</div>
					</div>
				</header>

				<section id="examples" className="scroll-mt-8 py-10 sm:py-14">
					<SectionHeading index="01 / TRY IT" title="Working examples" description="These controls use the same source files and tokens as the component catalog below." />
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
						<DemoFrame label="Buttons & badges" className="xl:col-span-2">
							<div className="flex flex-wrap items-center gap-2">
								<Button onClick={() => setActionMessage("Changes saved.")}>Save changes <ArrowUpRight aria-hidden="true" /></Button>
								<Button variant="secondary" onClick={() => setActionMessage("Secondary action selected.")}>Secondary</Button>
								<Button variant="outline" onClick={() => setActionMessage("Outline action selected.")}>Outline</Button>
								<Button variant="ghost" onClick={() => setActionMessage("Ghost action selected.")}>Ghost</Button>
								<Button variant="destructive" onClick={() => setActionMessage("Destructive style previewed. No data was deleted.")}>Delete</Button>
							</div>
							<p className="mt-3 min-h-5 text-xs text-muted-foreground" role="status" aria-live="polite">{actionMessage}</p>
							<div className="mt-5 flex flex-wrap items-center gap-2">
								<Badge>Default</Badge><Badge variant="secondary">In progress</Badge><Badge variant="outline">Draft</Badge><Badge variant="destructive">Needs attention</Badge>
							</div>
						</DemoFrame>

						<DemoFrame label="Form controls">
							<div className="space-y-4">
								<div className="space-y-2"><Label htmlFor="gallery-name">Workspace name</Label><Input id="gallery-name" defaultValue="LunoRX Studio" /></div>
								<div className="flex items-center justify-between"><Label htmlFor="gallery-notifications">Email notifications</Label><Switch id="gallery-notifications" defaultChecked /></div>
								<div className="flex items-center gap-2"><Checkbox id="gallery-terms" defaultChecked /><Label htmlFor="gallery-terms" className="font-normal">Include release notes</Label></div>
							</div>
						</DemoFrame>

						<DemoFrame label="Select & radio">
							<div className="space-y-5">
								<div className="space-y-2"><Label htmlFor="gallery-framework">Framework</Label><Select defaultValue="astro"><SelectTrigger id="gallery-framework" className="w-full"><SelectValue placeholder="Choose a framework" /></SelectTrigger><SelectContent><SelectItem value="astro">Astro</SelectItem><SelectItem value="react">React</SelectItem><SelectItem value="vue">Vue</SelectItem></SelectContent></Select></div>
								<RadioGroup defaultValue="comfortable" aria-label="Density" className="flex flex-wrap gap-x-5 gap-y-2">
									{[["comfortable", "Comfortable"], ["compact", "Compact"]].map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm"><RadioGroupItem value={value} id={`density-${value}`} />{label}</label>)}
								</RadioGroup>
							</div>
						</DemoFrame>

						<DemoFrame label="Slider & progress">
							<div className="space-y-5">
								<div className="flex items-center justify-between text-sm"><Label htmlFor="gallery-volume">Build capacity</Label><span className="font-mono text-xs text-muted-foreground">{sliderValue[0]}%</span></div>
								<Slider id="gallery-volume" value={sliderValue} onValueChange={(value) => setSliderValue(Array.isArray(value) ? value : [value])} max={100} step={1} aria-label="Build capacity" />
								<div className="space-y-2"><div className="flex justify-between text-xs"><span>Weekly target</span><span className="text-muted-foreground">68%</span></div><Progress value={68} /></div>
							</div>
						</DemoFrame>

						<DemoFrame label="Tabs & accordion">
							<Tabs defaultValue="overview">
								<TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="activity">Activity</TabsTrigger><TabsTrigger value="settings">Settings</TabsTrigger></TabsList>
								<TabsContent value="overview" className="pt-4 text-sm text-muted-foreground">A compact tab set with keyboard navigation built in.</TabsContent>
								<TabsContent value="activity" className="pt-4 text-sm text-muted-foreground">Recent updates appear here as they happen.</TabsContent>
								<TabsContent value="settings" className="pt-4 text-sm text-muted-foreground">Manage preferences for this workspace.</TabsContent>
							</Tabs>
							<Accordion className="mt-4" defaultValue={[]}>
								<AccordionItem value="details"><AccordionTrigger>How are these components added?</AccordionTrigger><AccordionContent>Each component is source code in this repository. Import only what your page uses.</AccordionContent></AccordionItem>
							</Accordion>
						</DemoFrame>

						<DemoFrame label="Dialog & tooltip">
							<div className="flex flex-wrap gap-2">
								<Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogTrigger render={<Button variant="outline" onClick={() => setPublished(false)} />}>Open dialog</DialogTrigger><DialogContent><DialogHeader><DialogTitle>{published ? "Changes published" : "Publish changes?"}</DialogTitle><DialogDescription>{published ? "The preview was published successfully." : "Publish the current preview to your project site?"}</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><DialogClose render={<Button variant="outline" />}>Cancel</DialogClose><Button onClick={() => { setPublished(true); setDialogOpen(false) }}>Publish</Button></div></DialogContent></Dialog>
								<Tooltip><TooltipTrigger render={<Button variant="secondary" size="icon" aria-label="More information">i</Button>}><span className="sr-only">More information</span></TooltipTrigger><TooltipContent>Interactive examples use Base UI.</TooltipContent></Tooltip>
							</div>
						</DemoFrame>

						<DemoFrame label="Alert & avatars">
							<Alert><Check aria-hidden="true" /><AlertTitle>All systems ready</AlertTitle><AlertDescription>Typecheck and production build are passing.</AlertDescription></Alert>
							<div className="mt-5 flex items-center gap-3"><AvatarGroup><Avatar><AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces" alt="Mina Chen" /><AvatarFallback>MC</AvatarFallback></Avatar><Avatar><AvatarImage src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=faces" alt="Alex Rivera" /><AvatarFallback>AR</AvatarFallback></Avatar><Avatar><AvatarFallback>+3</AvatarFallback></Avatar></AvatarGroup><span className="text-xs text-muted-foreground">5 contributors</span></div>
						</DemoFrame>

						<DemoFrame label="Card & textarea">
							<Card><CardHeader><CardTitle>Release notes</CardTitle><CardDescription>Share what changed in this update.</CardDescription></CardHeader><CardContent><Textarea aria-label="Release notes" placeholder="Write a short update…" className="min-h-20" /></CardContent></Card>
						</DemoFrame>

						<DemoFrame label="Motion · ticker & marquee" className="overflow-hidden">
							<div className="mb-5 flex items-end gap-2"><NumberTicker value={shadcnComponents.length + magicComponents.length} className="text-4xl font-semibold tracking-tight text-foreground" /><span className="pb-1 text-xs text-muted-foreground">components installed</span></div>
							<Marquee pauseOnHover repeat={3} className="[--duration:28s] [--gap:0.65rem]">
								{["Base UI", "Motion", "Astro", "Tailwind"].map((name) => <span key={name} className="squircle-xl border border-line bg-canvas px-3 py-2 text-xs text-muted-foreground">{name}</span>)}
							</Marquee>
						</DemoFrame>
					</div>
				</section>

				<section id="catalog" className="scroll-mt-8 border-t border-line py-10 sm:py-14">
					<SectionHeading index="02 / CATALOG" title="Find a component" description="All items are installed as editable source. Copy a local import path to use one in your page." />
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<label className="relative block w-full sm:max-w-sm">
							<Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 pl-10" placeholder="Search components…" aria-label="Search components" />
						</label>
						<div className="inline-flex w-fit items-center gap-1 squircle-2xl border border-line bg-surface p-1" aria-label="Filter component source">
							{([["all", "All"], ["shadcn", "shadcn"], ["magic", "Magic UI"]] as [Source, string][]).map(([value, label]) => <button key={value} type="button" onClick={() => setSource(value)} aria-pressed={source === value} className={`squircle-xl px-3 py-2 text-xs font-medium transition-colors ${source === value ? "bg-emphasis text-emphasis-foreground" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"}`}>{label}</button>)}
						</div>
					</div>

					<div className="mt-8 space-y-10">
						{filteredShadcn.length > 0 && <CatalogGroup title="shadcn / Base UI" count={filteredShadcn.length} items={filteredShadcn} isMagic={false} copied={copied} onCopy={copyPath} />}
						{filteredMagic.length > 0 && <CatalogGroup title="Magic UI" count={filteredMagic.length} items={filteredMagic} isMagic copied={copied} onCopy={copyPath} />}
						{filteredShadcn.length + filteredMagic.length === 0 && <div className="squircle-3xl border border-dashed border-line bg-surface p-10 text-center"><p className="font-medium">No components match “{query}”.</p><p className="mt-2 text-sm text-muted-foreground">Try another name or clear the search.</p><Button variant="outline" className="mt-5" onClick={() => setQuery("")}>Clear search</Button></div>}
					</div>
					<p className="mt-8 text-xs text-muted-foreground" aria-live="polite">Showing {filteredShadcn.length + filteredMagic.length} of {shadcnComponents.length + magicComponents.length} components{copied ? ` · Copied ${copied}` : ""}</p>
				</section>

				<footer className="flex flex-col gap-3 border-t border-line py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
					<a href="/" className="font-medium text-foreground">LunoRX <span className="font-normal text-muted-foreground">UI library</span></a>
					<div className="flex items-center gap-4"><a className="hover:text-foreground" href="https://ui.shadcn.com/docs/components/base">shadcn / Base UI <ArrowUpRight className="inline size-3" /></a><a className="hover:text-foreground" href="https://magicui.design/docs/components">Magic UI <ArrowUpRight className="inline size-3" /></a></div>
				</footer>
			</main>
		</TooltipProvider>
	)
}

function CatalogGroup({
	title,
	count,
	items,
	isMagic,
	copied,
	onCopy,
}: {
	title: string
	count: number
	items: CatalogItem[]
	isMagic: boolean
	copied: string
	onCopy: (item: CatalogItem, isMagic: boolean) => void
}) {
	return (
		<section>
			<div className="mb-3 flex items-center gap-3"><h3 className="text-sm font-semibold">{title}</h3><span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{count}</span><div className="h-px flex-1 bg-line" /></div>
			<ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{items.map((item, index) => <li key={`${isMagic ? "magic" : "shadcn"}-${item.slug}`} className="group flex min-w-0 items-center gap-3 squircle-2xl border border-line bg-surface px-3 py-3 transition-colors hover:bg-surface-2">
						<span className="grid size-8 shrink-0 place-items-center squircle-xl bg-canvas font-mono text-[10px] text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
						<span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.title}</span><code className="mt-0.5 block truncate font-mono text-[9px] text-muted-foreground">@/components/{isMagic && item.slug === "striped-pattern" ? "magicui" : "ui"}/{item.slug}</code></span>
						<Tooltip><TooltipTrigger render={<button type="button" onClick={() => onCopy(item, isMagic)} aria-label={`Copy import path for ${item.title}`} className="grid size-8 shrink-0 place-items-center squircle-xl text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />}>{copied === item.slug ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}</TooltipTrigger><TooltipContent>{copied === item.slug ? "Import path copied" : "Copy import path"}</TooltipContent></Tooltip>
					</li>)}
			</ul>
		</section>
	)
}

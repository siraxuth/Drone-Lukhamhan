import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"

// OG image layout copied from shadcn-ui/ui (apps/v4/app/og/route.tsx).
// See shadcn-MIT-LICENSE.txt. Thai glyphs use Noto Sans Thai under fonts/OFL.txt.
export const runtime = "nodejs"

function wrapThai(text: string, maxChars: number): string[] {
  const segments = new Intl.Segmenter("th", { granularity: "word" }).segment(text)
  const lines: string[] = []
  let line = ""

  for (const { segment } of segments) {
    const next = `${line}${segment}`
    if (line.trim() && next.trimEnd().length > maxChars) {
      lines.push(line.trimEnd())
      line = segment.trimStart()
    } else {
      line = next
    }
  }

  if (line.trim()) lines.push(line.trimEnd())
  return lines
}

async function loadAssets(): Promise<
  { name: string; data: Buffer; weight: 400 | 600; style: "normal" }[]
> {
  const [
    { base64Font: normal },
    { base64Font: mono },
    { base64Font: semibold },
  ] = await Promise.all([
    import("./geist-regular-otf.json").then((mod) => mod.default || mod),
    import("./geistmono-regular-otf.json").then((mod) => mod.default || mod),
    import("./geist-semibold-otf.json").then((mod) => mod.default || mod),
  ])
  const [thaiRegular, thaiSemibold, latinRegular, latinSemibold] = await Promise.all([
    readFile(new URL("./fonts/noto-thai-400.ttf", import.meta.url)),
    readFile(new URL("./fonts/noto-thai-600.ttf", import.meta.url)),
    readFile(new URL("./fonts/noto-latin-400.ttf", import.meta.url)),
    readFile(new URL("./fonts/noto-latin-600.ttf", import.meta.url)),
  ])

  return [
    {
      name: "Geist",
      data: Buffer.from(normal, "base64"),
      weight: 400 as const,
      style: "normal" as const,
    },
    {
      name: "Geist Mono",
      data: Buffer.from(mono, "base64"),
      weight: 400 as const,
      style: "normal" as const,
    },
    {
      name: "Geist",
      data: Buffer.from(semibold, "base64"),
      weight: 600 as const,
      style: "normal" as const,
    },
    { name: "Noto Sans Thai", data: thaiRegular, weight: 400 as const, style: "normal" as const },
    { name: "Noto Sans Thai", data: thaiSemibold, weight: 600 as const, style: "normal" as const },
    { name: "Noto Sans Latin", data: latinRegular, weight: 400 as const, style: "normal" as const },
    { name: "Noto Sans Latin", data: latinSemibold, weight: 600 as const, style: "normal" as const },
  ]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get("title")?.slice(0, 160) ?? ""
  const description = searchParams.get("description")?.slice(0, 320) ?? ""

  const [fonts, logo] = await Promise.all([
    loadAssets(),
    readFile(new URL("../icon.png", import.meta.url)),
  ])
  const titleLines = wrapThai(title, 22)
  const descriptionLines = wrapThai(description, 36).slice(0, 4)
  const hasThaiTitle = /\p{Script=Thai}/u.test(title)

  return new ImageResponse(
    (
      <div
        tw="flex h-full w-full bg-black text-white"
        style={{ fontFamily: "Noto Sans Thai, Noto Sans Latin, Geist" }}
      >
        <div tw="flex border absolute border-stone-700 border-dashed inset-y-0 left-16 w-[1px]" />
        <div tw="flex border absolute border-stone-700 border-dashed inset-y-0 right-16 w-[1px]" />
        <div tw="flex border absolute border-stone-700 inset-x-0 h-[1px] top-16" />
        <div tw="flex border absolute border-stone-700 inset-x-0 h-[1px] bottom-16" />
        <div tw="flex absolute bottom-24 right-24 h-24 w-24 overflow-hidden rounded-2xl">
          <img
            src={`data:image/png;base64,${logo.toString("base64")}`}
            width={96}
            height={96}
            alt=""
          />
        </div>
        <div tw="flex flex-col absolute w-[896px] justify-center inset-32">
          <div
            tw="tracking-tight flex flex-col justify-center"
            style={{
              fontWeight: hasThaiTitle ? 400 : 600,
              fontSize: hasThaiTitle ? 64 : titleLines.length > 1 ? 64 : 80,
              lineHeight: hasThaiTitle ? 1.4 : 1.1,
              letterSpacing: hasThaiTitle ? "0em" : "-0.04em",
            }}
          >
            {titleLines.map((line, index) => <div key={index}>{line}</div>)}
          </div>
          <div
            tw="mt-8 flex flex-col text-[40px] leading-[1.35] text-stone-400"
            style={{
              fontWeight: 500,
            }}
          >
            {descriptionLines.map((line, index) => <div key={index}>{line}</div>)}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 628,
      fonts,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Robots-Tag": "noindex",
      },
    }
  )
}

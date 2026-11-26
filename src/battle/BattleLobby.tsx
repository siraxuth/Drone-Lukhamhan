'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Box, KeyRound, Plus, Radio, RefreshCw, Search, Trophy, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ScenarioView } from '@/lib/scenarios';
import { battleApi, battleRequest, flightLabel } from './client';
import { battleLevels, CreateBattleDialog, type SetupTab } from './CreateBattleDialog';
import { FORMATS, type ListedRoom } from './types';

function JoinDialog({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  function join(event: FormEvent) {
    event.preventDefault();
    router.push('/battle/' + code.trim().toUpperCase() + '?role=join');
  }
  return <Dialog>
    <DialogTrigger render={<Button variant="outline" size="lg" />}><KeyRound data-icon="inline-start" /> เข้าด้วยรหัส</DialogTrigger>
    <DialogContent overlayClassName="bg-black/35 backdrop-blur-md" className="squircle-3xl p-5">
      <DialogHeader>
        <DialogTitle>เข้าห้องด้วยรหัส</DialogTitle>
        <DialogDescription>ใช้รหัส 8 ตัวจากคนที่สร้างห้อง</DialogDescription>
      </DialogHeader>
      <form onSubmit={join} className="grid gap-3">
        <Field>
          <FieldLabel htmlFor="battle-room-code">รหัสห้อง</FieldLabel>
          <Input id="battle-room-code" className="font-mono uppercase" autoComplete="off" required pattern="[0-9a-fA-F]{8}" maxLength={8} value={code} onChange={event => setCode(event.target.value)} />
        </Field>
        <Button type="submit">เปิดห้อง</Button>
      </form>
      {!signedIn && <Link href="/login?next=/battle" className="text-muted-foreground underline underline-offset-4">ล็อกอินเพื่อเก็บแต้มอันดับ Battle</Link>}
    </DialogContent>
  </Dialog>;
}

function RoomCard({ room }: { room: ListedRoom }) {
  const live = room.status === 'active';
  return <Card className="min-w-0 squircle-2xl">
    <CardHeader>
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <Badge variant={live ? 'default' : 'secondary'}>{live && <Radio aria-hidden="true" />}{live ? 'กำลังแข่ง' : 'รอแข่ง'}</Badge>
        {room.ranked && <Badge variant="outline">เก็บแต้ม</Badge>}
      </div>
      <CardTitle className="text-lg">{room.title}</CardTitle>
      <CardDescription className="break-words">{room.host} · {FORMATS[room.format]}</CardDescription>
    </CardHeader>
    <CardContent className="grid gap-2">
      <p className="text-muted-foreground">{flightLabel[room.flight]} · ระดับ{battleLevels[room.difficulty]}</p>
      <p className="flex flex-wrap items-center gap-x-2 text-muted-foreground"><Users className="size-4" aria-hidden="true" /> ผู้แข่ง {room.pilots}/{room.pilotLimit} · ผู้ชม {room.watchers}</p>
    </CardContent>
    <CardFooter className="mt-auto justify-between gap-2 border-t py-3">
      <span className="font-mono text-xs text-muted-foreground">{room.code}</span>
      <Button size="sm" variant="outline" nativeButton={false} render={<Link href={'/battle/' + room.code + (room.canCompete ? '?role=join' : '')} />}>
        {room.canCompete ? 'เข้าห้อง' : live ? 'ดูสด' : 'เข้าดู'} <ArrowUpRight data-icon="inline-end" />
      </Button>
    </CardFooter>
  </Card>;
}

export function BattleLobby({ scenarios, signedIn, ranked, scores, initialRooms }: {
  scenarios: ScenarioView[]; signedIn: boolean; ranked: boolean; scores: { name: string; rating: number; games: number }[];
  initialRooms: ListedRoom[] | null;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<SetupTab>('scenario');
  const [rooms, setRooms] = useState(initialRooms ?? []);
  const [failed, setFailed] = useState(initialRooms === null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  function openSetup(next: SetupTab) {
    setTab(next);
    setOpen(true);
  }

  const refresh = useCallback(async () => {
    try {
      const result = await battleRequest<{ rooms: ListedRoom[] }>(battleApi);
      setRooms(result.rooms);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 7000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const search = query.trim().toLocaleLowerCase();
  const visible = rooms.filter(room => (filter === 'all' || room.status === filter)
    && [room.title, room.host, room.code].some(value => value.toLocaleLowerCase().includes(search)));

  return <>
    <Card className="relative isolate min-w-0 overflow-hidden squircle-3xl bg-surface-2 p-0">
      <div className="grid items-center md:grid-cols-[1.25fr_1fr]">
        <CardHeader className="relative z-10 gap-4 px-6 py-9 sm:px-10 md:py-14 lg:px-14">
          <div className="grid gap-1">
            <h1 className="font-display text-5xl font-extrabold tracking-tight sm:text-7xl">Battle</h1>
            <p className="text-xl font-semibold sm:text-2xl">ห้องแข่งโดรน</p>
          </div>
          <CardDescription className="max-w-md text-base">เลือกโจทย์เดียวกัน เขียนโค้ดแข่ง หรือเข้าดูเพื่อนบินสดได้เลย</CardDescription>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" onClick={() => openSetup('scenario')}><Plus data-icon="inline-start" /> สร้างห้อง</Button>
            <JoinDialog signedIn={signedIn} />
          </div>
          <div><Button variant="ghost" onClick={() => openSetup('preview')} disabled={!scenarios.length}><Box data-icon="inline-start" /> ลองเทียบการบิน 3D</Button></div>
        </CardHeader>
        <div aria-hidden="true" className="relative hidden h-full min-h-72 md:block">
          <div className="absolute inset-y-[12%] left-[12%] aspect-square max-w-[76%] rounded-full border border-line" />
          <div className="absolute inset-y-[20%] left-[20%] aspect-square max-w-[60%] rounded-full border border-line" />
          <Image src="/docs/drone-iso.webp" alt="" fill priority sizes="(max-width: 768px) 1px, 40vw" className="object-contain p-6 lg:p-10" />
        </div>
      </div>
    </Card>
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
      <section aria-labelledby="battle-directory" className="grid min-w-0 content-start gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 id="battle-directory" className="text-2xl font-bold">ห้องที่เข้าได้</h2><p className="text-sm text-muted-foreground">เลือกห้องสาธารณะเพื่อเข้าแข่งหรือดูสด</p></div>
          <Button variant="outline" size="icon" aria-label="อัปเดตรายชื่อห้อง" onClick={() => void refresh()}><RefreshCw /></Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={filter} onValueChange={setFilter} aria-label="สถานะห้อง">
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
              <TabsTrigger value="lobby">รอแข่ง</TabsTrigger>
              <TabsTrigger value="active">กำลังแข่ง</TabsTrigger>
            </TabsList>
          </Tabs>
          <InputGroup className="w-full sm:ml-auto sm:w-64">
            <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
            <InputGroupInput aria-label="ค้นหาห้อง" placeholder="ค้นหาโจทย์ ชื่อคนสร้าง หรือรหัส" value={query} onChange={event => setQuery(event.target.value)} />
          </InputGroup>
        </div>
        {failed && <Alert variant="destructive"><AlertDescription>อัปเดตรายชื่อห้องไม่ได้ ลองกดรีเฟรชอีกครั้ง</AlertDescription></Alert>}
        {visible.length > 0 ? <div className="grid min-w-0 gap-3 sm:grid-cols-2">{visible.map(room => <RoomCard key={room.code} room={room} />)}</div>
          : !failed && <Empty className="squircle-2xl border border-dashed border-line">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Radio /></EmptyMedia>
              <EmptyTitle>{search || filter !== 'all' ? 'ไม่พบห้องที่ตรงกัน' : 'ยังไม่มีห้องสาธารณะ'}</EmptyTitle>
              <EmptyDescription>{search || filter !== 'all' ? 'ลองเปลี่ยนคำค้นหรือเลือกสถานะห้องอื่น' : 'สร้างห้องใหม่ หรือกรอกรหัสที่เพื่อนส่งมา'}</EmptyDescription>
            </EmptyHeader>
          </Empty>}
      </section>
      <Card className="self-start squircle-2xl" aria-label="อันดับ Battle">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Trophy className="size-4" aria-hidden="true" /> อันดับ Battle</CardTitle></CardHeader>
        <CardContent>
          {scores.length ? <ol className="divide-y divide-line">{scores.map((score, index) => <li key={index} className="flex justify-between gap-2 py-2 text-sm"><span className="break-words">{index + 1}. {score.name}</span><b className="shrink-0 tabular-nums">{score.rating} แต้ม</b></li>)}</ol>
            : <p className="text-sm text-muted-foreground">ยังไม่มีผลแข่งเก็บแต้ม</p>}
        </CardContent>
      </Card>
    </div>
    <CreateBattleDialog open={open} onOpenChange={setOpen} tab={tab} onTabChange={setTab} scenarios={scenarios} ranked={ranked} />
  </>;
}

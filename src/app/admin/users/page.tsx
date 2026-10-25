import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getSession, requireRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { removeUser, setRole } from '../actions';
import { Notice, PageHead, dateTh } from '../ui';

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  if (!(await requireRole('ADMIN'))) redirect('/admin');
  const me = (await getSession())!.user.id;
  const { ok, error } = await searchParams;
  const users = await db.user.findMany({ orderBy: { createdAt: 'desc' } });
  return (
    <>
      <PageHead title="สมาชิกและสิทธิ์" desc="แอดมินจัดการทุกอย่าง · ครูจัดการเนื้อหา · สมาชิกดูอย่างเดียว" />
      <Notice ok={ok} error={error} />
      <div className="overflow-x-auto squircle-3xl border border-line bg-surface">
        <Table>
          <TableHeader><TableRow><TableHead>ชื่อ</TableHead><TableHead>อีเมล</TableHead><TableHead>สมัครเมื่อ</TableHead><TableHead>สิทธิ์</TableHead><TableHead className="w-24 text-right">ลบ</TableHead></TableRow></TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="text-base font-semibold">{u.name}{u.id === me && <span className="ml-2 text-sm font-normal text-brand-blue">(คุณ)</span>}</TableCell>
                <TableCell className="text-base text-muted-foreground">{u.email}</TableCell>
                <TableCell className="text-base text-muted-foreground">{dateTh(u.createdAt)}</TableCell>
                <TableCell>
                  <form action={setRole.bind(null, u.id)} className="flex items-center gap-2">
                    <select name="role" defaultValue={u.role} disabled={u.id === me} aria-label={`สิทธิ์ของ ${u.name}`} className="h-10 rounded-lg border border-input bg-transparent px-2 text-base disabled:opacity-50">
                      <option value="ADMIN">แอดมิน</option><option value="TEACHER">ครู</option><option value="MEMBER">สมาชิก</option>
                    </select>
                    {u.id !== me && <Button type="submit" size="sm" variant="outline" className="h-10 text-base">บันทึก</Button>}
                  </form>
                </TableCell>
                <TableCell className="text-right">
                  {u.id !== me && <form action={removeUser.bind(null, u.id)}><Button type="submit" variant="ghost" size="sm" className="h-10 text-base text-brand-red">ลบ</Button></form>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

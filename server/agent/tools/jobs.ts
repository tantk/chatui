type Data = Record<string, any>;

export const jobs = {
  addApplication(args: { id?: string; company: string; role: string; stage?: string }, data: Data) {
    const id = args.id ?? crypto.randomUUID();
    data.columns = data.columns ?? [];
    const stage = args.stage ?? "Applied";
    let col = data.columns.find((c: any) => c.name === stage);
    if (!col) {
      col = { name: stage, items: [] };
      data.columns.push(col);
    }
    col.items.push({ id, title: args.company, subtitle: args.role });
    return { ok: true, id };
  },
  moveStage(args: { id: string; toStage: string }, data: Data) {
    let moved: any = null;
    for (const col of data.columns ?? []) {
      const i = (col.items ?? []).findIndex((it: any) => it.id === args.id);
      if (i >= 0) {
        moved = col.items.splice(i, 1)[0];
        break;
      }
    }
    if (!moved) return { ok: false, error: "id not found" };
    let dest = (data.columns ?? []).find((c: any) => c.name === args.toStage);
    if (!dest) {
      dest = { name: args.toStage, items: [] };
      data.columns.push(dest);
    }
    dest.items.push(moved);
    return { ok: true };
  },
  addContact(args: { name: string; role?: string; email?: string }, data: Data) {
    data.contacts = data.contacts ?? [];
    data.contacts.push(args);
    return { ok: true };
  },
  logEvent(args: { applicationId: string; event: string; date?: string }, data: Data) {
    data.events = data.events ?? [];
    data.events.push({ ...args, date: args.date ?? new Date().toISOString() });
    return { ok: true };
  },
};

type Data = Record<string, any>;

export const trip = {
  addDay(args: { date: string; title: string; items?: string[] }, data: Data) {
    data.days = data.days ?? [];
    data.days.push({ ...args, items: args.items ?? [] });
    return { ok: true };
  },
  addActivity(args: { dayDate: string; activity: string }, data: Data) {
    const day = (data.days ?? []).find((d: any) => d.date === args.dayDate);
    if (!day) return { ok: false, error: "day not found" };
    day.items = day.items ?? [];
    day.items.push(args.activity);
    return { ok: true };
  },
  setBudget(args: { amount: number; currency: string }, data: Data) {
    data.budget = args;
    return { ok: true };
  },
  movePin(args: { label: string; lat: number; lng: number }, data: Data) {
    data.pins = data.pins ?? [];
    const i = data.pins.findIndex((p: any) => p.label === args.label);
    if (i >= 0) data.pins[i] = args;
    else data.pins.push(args);
    return { ok: true };
  },
};

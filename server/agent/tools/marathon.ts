type Data = Record<string, any>;

export const marathon = {
  addRun(args: { date: string; miles: number; pace: string }, data: Data) {
    data.runs = data.runs ?? [];
    data.runs.push({ ...args, x: args.date, y: args.miles });
    return { ok: true, runsCount: data.runs.length };
  },
  removeRun(args: { date: string }, data: Data) {
    const before = (data.runs ?? []).length;
    data.runs = (data.runs ?? []).filter((r: any) => r.date !== args.date);
    return { ok: true, removed: before - data.runs.length };
  },
  setGoalRace(args: { name: string; date: string; targetTime?: string }, data: Data) {
    data.goalRace = args;
    return { ok: true };
  },
  planWeek(args: { miles: number }, data: Data) {
    data.plannedWeekMiles = args.miles;
    return { ok: true };
  },
};

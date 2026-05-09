import { Container } from "./Container";
import { Header } from "./Header";
import { Stat } from "./Stat";
import { LineChart } from "./LineChart";
import { List } from "./List";

export const WIDGETS: Record<string, any> = {
  container: Container,
  header: Header,
  stat: Stat,
  linechart: LineChart,
  list: List,
};

import { Container } from "./Container";
import { Header } from "./Header";
import { Stat } from "./Stat";
import { LineChart } from "./LineChart";
import { BarChart } from "./BarChart";
import { ProgressRing } from "./ProgressRing";
import { Calendar } from "./Calendar";
import { Map } from "./Map";
import { DayCard } from "./DayCard";
import { PhotoGallery } from "./PhotoGallery";
import { KanbanBoard } from "./KanbanBoard";
import { ContactCard } from "./ContactCard";
import { StatusPill } from "./StatusPill";
import { List } from "./List";
import { Form } from "./Form";
import { Button } from "./Button";

export const WIDGETS: Record<string, any> = {
  container: Container,
  header: Header,
  stat: Stat,
  linechart: LineChart,
  barchart: BarChart,
  progressring: ProgressRing,
  calendar: Calendar,
  map: Map,
  daycard: DayCard,
  photogallery: PhotoGallery,
  kanbanboard: KanbanBoard,
  contactcard: ContactCard,
  statuspill: StatusPill,
  list: List,
  form: Form,
  button: Button,
};

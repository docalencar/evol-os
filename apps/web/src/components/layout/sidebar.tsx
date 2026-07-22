import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  Home,
  MessageSquare,
  Settings,
  Target,
  Users,
} from "lucide-react";
const items = [
  { href: "/app", label: "Início", icon: Home },
  { href: "/app/people", label: "Pessoas", icon: Users },
  { href: "/app/recruitment", label: "Recruitment", icon: BriefcaseBusiness },
  {href: "/app/competencies",
  label: "Competências",
  icon: BookOpen,},
  { href: "/app/assessments", label: "Avaliações", icon: ClipboardList },
  { href: "/app/feedbacks", label: "Feedbacks", icon: MessageSquare },
  { href: "/app/development", label: "Desenvolvimento", icon: Target },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/app/company", label: "Empresa", icon: Building2 },
  { href: "/app/settings", label: "Configurações", icon: Settings }
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-slate-200 bg-white p-4">
      <div className="mb-8">
        <p className="text-xl font-bold text-slate-900">Evol People</p>
        <p className="text-xs text-slate-500">Evol Performance MVP</p>
      </div>

      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

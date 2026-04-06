export type DashboardSection = "dashboard" | "users";

type NavItem = {
  id: DashboardSection;
  label: string;
};

const DEFAULT_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "users", label: "Users" },
];

const Sidebar = ({
  activeSection,
  onSelect,
  items = DEFAULT_ITEMS,
}: {
  activeSection: DashboardSection;
  onSelect: (next: DashboardSection) => void;
  items?: NavItem[];
}) => {
  const base =
    "w-full text-left block px-4 py-3 rounded-lg transition-colors duration-200 text-sm";

  const active = "bg-[#6C63FF] text-white";
  const inactive = "text-gray-400 hover:bg-[#1C1F2A] hover:text-white";

  return (
    <aside className="w-64 bg-[#16181F] p-5 border-r border-gray-800 shrink-0">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-xl font-semibold text-[#6C63FF]">Finora</h1>
      </div>

      <nav className="space-y-2">
        {items.map((item) => {
          const isActive = item.id === activeSection;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`${base} ${isActive ? active : inactive}`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
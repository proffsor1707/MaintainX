import { useMemo, useState } from "react";

import { initialModules } from "@/mocks/mockData";
import type { RiskModule, Severity } from "@/types/dashboard";

type RiskSortKey = "riskScore" | "complexity" | "churn";

export function useDashboardRisk() {
  const [modules] = useState<RiskModule[]>(initialModules);
  const [severityFilter, setSeverityFilter] = useState<"all" | Severity>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<RiskSortKey>("riskScore");
  const [selectedPath, setSelectedPath] = useState(initialModules[0].path);

  const selectedModule = modules.find((module) => module.path === selectedPath) ?? modules[0];

  const filteredModules = useMemo(() => {
    return [...modules]
      .filter((module) => severityFilter === "all" || module.severity === severityFilter)
      .filter((module) => `${module.path} ${module.service} ${module.owner}`.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b[sortBy] - a[sortBy]);
  }, [modules, searchTerm, severityFilter, sortBy]);

  return {
    modules,
    severityFilter,
    setSeverityFilter,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    selectedPath,
    setSelectedPath,
    selectedModule,
    filteredModules,
  };
}

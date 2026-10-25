import { useMemo, useState } from "react";

import { initialModules } from "@/mocks/mockData";
import type { RiskModule, Severity } from "@/types/dashboard";

type RiskSortKey = "riskScore" | "complexity" | "churn";

export function useDashboardRisk() {
  const [modules, setModules] = useState<RiskModule[]>(initialModules);
  const [severityFilter, setSeverityFilter] = useState<"all" | Severity>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<RiskSortKey>("riskScore");
  const [selectedPath, setSelectedPath] = useState(initialModules[0].path);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  const selectedModule = modules.find((module) => module.path === selectedPath) ?? modules[0];

  const filteredModules = useMemo(() => {
    return [...modules]
      .filter((module) => severityFilter === "all" || module.severity === severityFilter)
      .filter((module) => `${module.path} ${module.service} ${module.owner}`.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b[sortBy] - a[sortBy]);
  }, [modules, searchTerm, severityFilter, sortBy]);

  const runScan = (onComplete: () => void) => {
    setIsScanning(true);
    setScanComplete(false);
    window.setTimeout(() => {
      setIsScanning(false);
      setScanComplete(true);
      setModules((current) => current.map((module, index) => ({
        ...module,
        riskScore: Math.max(18, module.riskScore + (index % 2 === 0 ? 1 : -2)),
        lastChanged: index === 0 ? "just now" : module.lastChanged,
      })));
      onComplete();
    }, 1100);
  };

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
    isScanning,
    scanComplete,
    runScan,
    clearScanComplete: () => setScanComplete(false),
  };
}
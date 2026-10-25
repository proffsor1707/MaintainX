import { useState } from "react";

import { repositories } from "@/mocks/mockData";

export function useRepositorySelection() {
  const [repoIndex, setRepoIndex] = useState(0);

  return {
    repoIndex,
    setRepoIndex,
    repository: repositories[repoIndex],
  };
}

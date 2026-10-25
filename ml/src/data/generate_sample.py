import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from src.data.schema import REQUIRED_COLUMNS


def generate_synthetic_dataset(rows: int = 360, random_state: int = 2026) -> pd.DataFrame:
    if rows < 30:
        raise ValueError("Synthetic fixture must contain at least 30 rows.")

    rng = np.random.default_rng(random_state)
    cpu = rng.uniform(5, 99, rows)
    memory = rng.uniform(10, 99, rows)
    response_time = rng.lognormal(mean=4.2, sigma=0.75, size=rows)
    error_rate = rng.beta(1.2, 35, rows)
    request_volume = rng.integers(40, 12000, rows)
    historical_incidents = rng.poisson(0.7, rows)

    signal = (
        -4.1
        + 0.035 * (cpu - 65)
        + 0.028 * (memory - 65)
        + 0.006 * (response_time - 80)
        + 18.0 * (error_rate - 0.03)
        + 0.75 * historical_incidents
    )
    probability = 1 / (1 + np.exp(-signal))
    target = rng.binomial(1, probability)

    dataset = pd.DataFrame(
        {
            "cpu_usage": cpu,
            "memory_usage": memory,
            "response_time_ms": response_time,
            "error_rate": error_rate,
            "request_volume": request_volume,
            "historical_incidents_30d": historical_incidents,
            "failure_within_24h": target,
        }
    )

    missing_mask = rng.random((rows, len(REQUIRED_COLUMNS) - 1)) < 0.025
    for column_index, column in enumerate(REQUIRED_COLUMNS[:-1]):
        dataset.loc[missing_mask[:, column_index], column] = np.nan
    return dataset.loc[:, REQUIRED_COLUMNS]


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate deterministic synthetic pipeline data.")
    parser.add_argument("--output", type=Path, default=Path("datasets/synthetic_failure_risk.csv"))
    parser.add_argument("--rows", type=int, default=360)
    parser.add_argument("--seed", type=int, default=2026)
    args = parser.parse_args()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    generate_synthetic_dataset(args.rows, args.seed).to_csv(args.output, index=False)
    print(f"Wrote {args.rows} synthetic rows to {args.output}")


if __name__ == "__main__":
    main()
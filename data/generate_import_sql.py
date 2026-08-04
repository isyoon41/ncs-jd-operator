import csv
import sys

SRC = "ncs_competency_units_20251231_utf8.csv"
BATCH_SIZE = 500


def esc(value: str) -> str:
    return value.replace("'", "''")


def main():
    with open(SRC, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"total rows: {len(rows)}", file=sys.stderr)

    batch_num = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        batch_num += 1
        values = []
        for row in batch:
            code = esc(row["분류번호"].strip())
            name = esc(row["명칭"].strip())
            level = esc(row["수준"].strip())
            if not code or not name:
                continue
            values.append(f"('{code}', '{name}', '{level}')")

        if not values:
            continue

        values_with_ts = [f"{v[:-1]}, now())" for v in values]
        sql = (
            "insert into ncs_competency_units (ncs_code, name, level, synced_at)\nvalues\n"
            + ",\n".join(values_with_ts)
            + "\non conflict (ncs_code) do update set name = excluded.name, level = excluded.level, synced_at = excluded.synced_at;"
        )

        out_path = f"batch_{batch_num:03d}.sql"
        with open(out_path, "w", encoding="utf-8") as out:
            out.write(sql)
        print(f"wrote {out_path} ({len(values_with_ts)} rows)", file=sys.stderr)


if __name__ == "__main__":
    main()

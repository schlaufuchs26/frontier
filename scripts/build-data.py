"""Build Frontier's game data from Natural Earth 50m polygons + mledoze/countries.

Inputs (download next to this script, e.g. into /tmp/frontier-data):
  curl -sLO https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson
  curl -sLo ne50.geojson ne_50m_admin_0_countries.geojson
  curl -sLo countries.json https://raw.githubusercontent.com/mledoze/countries/master/countries.json

Outputs (into <repo>/src/data):
  countries.ts  -> game entities (id, name, neighbours, region, ...)
  world.ts      -> map shapes; SVG paths in map space (x = lon + 180, y = 90 - lat)
"""
import json
import math
import os
import sys

NE = "ne50.geojson"
CS = "countries.json"
OUT = "out"

# NE ADM0_A3 differs from ISO3 for a few entities.
NE_CODE = {"PSE": "PSX", "SSD": "SDS", "UNK": "KOS"}
EXTRA_ENTITIES = {"PSE", "UNK", "TWN"}  # not UN members but standard in country games

RDP_EPS = 0.04  # degrees (~4 km); keeps 50m detail without the file bloat


def rdp(points, eps):
    """Ramer-Douglas-Peucker simplification for closed rings."""
    if len(points) < 4:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        start, end = stack.pop()
        ax, ay = points[start]
        bx, by = points[end]
        dx, dy = bx - ax, by - ay
        norm = math.hypot(dx, dy)
        max_dist = -1.0
        idx = -1
        for i in range(start + 1, end):
            px, py = points[i]
            if norm == 0:
                dist = math.hypot(px - ax, py - ay)
            else:
                dist = abs(dx * (ay - py) - (ax - px) * dy) / norm
            if dist > max_dist:
                max_dist = dist
                idx = i
        if max_dist > eps and idx > start:
            keep[idx] = True
            stack.append((start, idx))
            stack.append((idx, end))
    return [p for p, k in zip(points, keep) if k]


def ring_area(ring):
    s = 0.0
    for i in range(len(ring)):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % len(ring)]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2


def ring_eps(ring):
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    diag = math.hypot(max(xs) - min(xs), max(ys) - min(ys))
    return min(0.25, max(0.02, 0.012 * diag))


def clean_ring(ring):
    pts = [(round(x, 2), round(y, 2)) for x, y in ring]
    dedup = []
    for p in pts:
        if not dedup or dedup[-1] != p:
            dedup.append(p)
    if len(dedup) > 3 and dedup[0] == dedup[-1]:
        dedup = dedup[:-1]
    if len(dedup) < 3:
        return dedup
    dedup = rdp(dedup, ring_eps(dedup))
    return dedup


def path_d(polys):
    """polys: list of polygons; polygon = [outer_ring, hole, ...] in lon/lat."""
    parts = []
    for poly in polys:
        for ri, ring in enumerate(poly):
            pts = clean_ring(ring)
            if len(pts) < 3 or ring_area(pts) < 0.03:
                continue
            d = "M" + " ".join(f"{x + 180:.2f} {90 - y:.2f}" for x, y in pts) + "Z"
            parts.append(d)
    return "".join(parts)


def bbox(ring):
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    return [min(xs), min(ys), max(xs), max(ys)]


def main():
    countries = json.load(open(CS))
    ne = json.load(open(NE))
    os.makedirs(OUT, exist_ok=True)

    by_code = {c["cca3"]: c for c in countries}
    entity_ids = {c["cca3"] for c in countries if c["unMember"]} | EXTRA_ENTITIES
    entities = {}
    for cid in sorted(entity_ids):
        c = by_code[cid]
        name = c["name"]["common"]
        if cid == "UNK":
            name = "Kosovo"
        # symmetric adjacency only: drop one-sided claims (e.g. Sri Lanka -> India)
        neighbours = [
            b for b in c["borders"] if b in entity_ids and cid in by_code[b]["borders"]
        ]
        extras = [
            {"id": b, "name": by_code[b]["name"]["common"]}
            for b in c["borders"]
            if b not in entity_ids
        ]
        entities[cid] = {
            "id": cid,
            "name": name,
            "neighbours": sorted(neighbours, key=lambda x: by_code[x]["name"]["common"]),
            "extras": sorted(extras, key=lambda e: e["name"]),
            "region": c["region"],
            "subregion": c["subregion"],
            "landlocked": bool(c["landlocked"]),
            "area": c["area"],
            "center": [c["latlng"][1], c["latlng"][0]],  # [lon, lat]
        }

    # ---- shapes ----
    code_to_ne = {v: k for k, v in NE_CODE.items()}
    shapes = []
    for feat in ne["features"]:
        p = feat["properties"]
        ne_code = p.get("ADM0_A3")
        cid = code_to_ne.get(ne_code, ne_code)
        geom = feat["geometry"]
        polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        world_polys = []
        for poly in polys:
            world_polys.append([[(x, y) for x, y in ring] for ring in poly])
        d = path_d(world_polys)
        if not d:
            continue
        # main polygon = the one whose bbox is closest to the entity's centre (or the largest)
        best = None
        for poly in polys:
            bb = bbox(poly[0])
            size = (bb[2] - bb[0]) * (bb[3] - bb[1])
            if best is None or size > best[0]:
                best = (size, bb)
        main_bb = best[1]
        entry = {"id": cid, "ne": ne_code, "name": p.get("NAME"), "d": d}
        if cid in entities:
            c = entities[cid]
            lon, lat = c["center"]
            # pick polygon containing / nearest the centre for the zoom box
            def dist_to_bb(bb):
                dx = max(bb[0] - lon, 0, lon - bb[2])
                dy = max(bb[1] - lat, 0, lat - bb[3])
                return dx + dy

            cand = sorted(
                (bbox(pl[0]) for pl in polys),
                key=lambda bb: (dist_to_bb(bb), -(bb[2] - bb[0]) * (bb[3] - bb[1])),
            )
            zoom_bb = cand[0]
            x0 = zoom_bb[0] + 180
            x1 = zoom_bb[2] + 180
            y0 = 90 - zoom_bb[3]
            y1 = 90 - zoom_bb[1]
            entry["zoom"] = [round(x0, 2), round(y0, 2), round(x1, 2), round(y1, 2)]
            entry["clickable"] = True
        else:
            entry["clickable"] = False
        shapes.append(entry)

    # symmetry + integrity checks
    bad = []
    for cid, e in entities.items():
        for n in e["neighbours"]:
            if cid not in entities[n]["neighbours"]:
                bad.append((cid, n))
    print("asymmetric pairs:", bad)

    # per-entity map bbox (all polygons) + a marker point inside the shape
    shape_by_id = {s["id"]: s for s in shapes}
    for cid, e in entities.items():
        e["hasShape"] = cid in shape_by_id
        if cid in shape_by_id:
            d = shape_by_id[cid]["d"]
            nums = [float(v) for v in d.replace("M", " ").replace("Z", " ").split()]
            xs, ys = nums[0::2], nums[1::2]
            e["bbox"] = [round(min(xs), 2), round(min(ys), 2), round(max(xs), 2), round(max(ys), 2)]
        lon, lat = e["center"]
        e["marker"] = [round(lon + 180, 2), round(90 - lat, 2)]
        e.pop("center", None)

    with open(os.path.join(OUT, "countries.json"), "w") as f:
        json.dump(list(entities.values()), f, separators=(",", ":"))
    with open(os.path.join(OUT, "world.json"), "w") as f:
        json.dump(shapes, f, separators=(",", ":"))

    print("entities", len(entities), "shapes", len(shapes))
    print("countries.json", os.path.getsize(os.path.join(OUT, "countries.json")) // 1024, "KB")
    print("world.json", os.path.getsize(os.path.join(OUT, "world.json")) // 1024, "KB")

    # sanity checks
    for cid in ["RUS", "CHN", "BRA", "FRA", "DEU", "TCD", "PRT", "UZB", "ITA", "ESP", "SRB"]:
        e = entities[cid]
        print(cid, e["name"], len(e["neighbours"]), e["neighbours"], "extras", e["extras"])


if __name__ == "__main__":
    main()
    emit_ts(sys.argv[1] if len(sys.argv) > 1 else ".")


def emit_ts(repo):
    """Write the game data as TypeScript modules for the frontier repo."""
    entities = json.load(open(os.path.join(OUT, "countries.json")))
    shapes = json.load(open(os.path.join(OUT, "world.json")))
    header = (
        "// GENERATED FILE - do not edit by hand.\n"
        "// Built by scripts/build-data.py from:\n"
        "//   Natural Earth 50m admin-0 countries (public domain)\n"
        "//   https://www.naturalearthdata.com/\n"
        "//   mledoze/countries (ODbL) for names and land borders\n"
        "//   https://github.com/mledoze/countries\n"
    )
    os.makedirs(os.path.join(repo, "src/data"), exist_ok=True)
    with open(os.path.join(repo, "src/data/countries.ts"), "w") as f:
        f.write(header)
        f.write('import type { Country } from "../game/types";\n\n')
        f.write("export const COUNTRIES: Country[] = ")
        json.dump(entities, f, separators=(",", ":"))
        f.write(";\n")
    with open(os.path.join(repo, "src/data/world.ts"), "w") as f:
        f.write(header)
        f.write('import type { Shape } from "../game/types";\n\n')
        f.write("export const SHAPES: Shape[] = ")
        json.dump(shapes, f, separators=(",", ":"))
        f.write(";\n")
    print("emitted TS data to", repo)

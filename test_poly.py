import json
import subprocess
import math

wkt = "POLYGON ((-86.0933257118222 11.9709967065619,-86.0932665446114 11.971209680012,-86.0932612999747 11.9712617942101,-86.0932140884632 11.971253775199,-86.0932822452424 11.9709923838275,-86.0933257118222 11.9709967065619))"

# Simple point in polygon check (ray casting)
def point_in_polygon(x, y, poly):
    n = len(poly)
    inside = False
    p1x, p1y = poly[0]
    for i in range(1, n + 1):
        p2x, p2y = poly[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xints = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xints:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

# Extract polygon points
coords_str = wkt.replace("POLYGON ((", "").replace("))", "")
points = []
for p in coords_str.split(","):
    lon, lat = p.strip().split(" ")
    points.append((float(lon), float(lat)))

# Test points
test_points = {
    "11": (-86.09332044075825, 11.971170058763814),
    "13": (-86.09320649919738, 11.97107729562244),
    "14": (-86.09311272140519, 11.971060300286316),
}

for name, (px, py) in test_points.items():
    inside = point_in_polygon(px, py, points)
    print(f"Lote {name} at ({px}, {py}) is strictly inside: {inside}")

    # calculate distance to line segments if not inside
    if not inside:
        min_d = 999999
        for i in range(len(points) - 1):
            p1x, p1y = points[i]
            p2x, p2y = points[i+1]
            
            # segment length squared
            l2 = (p1x - p2x)**2 + (p1y - p2y)**2
            if l2 == 0:
                t = 0
            else:
                t = max(0, min(1, ((px - p1x) * (p2x - p1x) + (py - p1y) * (p2y - p1y)) / l2))
            proj_x = p1x + t * (p2x - p1x)
            proj_y = p1y + t * (p2y - p1y)
            d = math.sqrt((px - proj_x)**2 + (py - proj_y)**2)
            if d < min_d:
                min_d = d
        print(f"  Distance to boundary: {min_d} degrees (~{min_d * 111000} meters)")

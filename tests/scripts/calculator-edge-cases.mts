import assert from "node:assert/strict";
import { calculate } from "../../lib/calculator/index";
import type { BuildingInput, FoundationType } from "../../lib/calculator/types";

const base: BuildingInput = {
  region: "krsk_city",
  objectType: "sklad",
  length: 24,
  width: 12,
  height: 6,
  frame: "metal",
  cladding: "sandwich_minvata",
  claddingThk: 150,
  roofing: "sandwich_minvata",
  roofingThk: 150,
  foundation: "slab_200",
  gates: [],
  windows: [],
  doors: { count: 0 },
};

function estimate(input: Partial<BuildingInput> = {}) {
  return calculate({ ...base, ...input });
}

function assertEngineer(input: Partial<BuildingInput>, flag: string) {
  const result = estimate(input);
  assert.equal(result.complexity, "ENGINEER_REQUIRED");
  assert.ok(result.flags.includes(flag as never), `expected flag ${flag}, got ${result.flags.join(",")}`);
  assert.ok(result.totals.final > 0);
}

assert.throws(() => estimate({ length: 0 }), /length must be a positive number/);
assert.throws(() => estimate({ width: -1 }), /width must be a positive number/);
assert.throws(() => estimate({ height: 0 }), /height must be a positive number/);
assert.throws(
  () => estimate({ gates: [{ size: "4x4", count: -1 }] }),
  /gates\[0\]\.count must be a non-negative number/,
);
assert.throws(
  () => estimate({ windows: [{ size: "1500x2000", count: -2 }] }),
  /windows\[0\]\.count must be a non-negative number/,
);
assert.throws(() => estimate({ doors: { count: -1 } }), /doors\.count must be a non-negative number/);

const coldHangar = estimate({
  objectType: "angar",
  cladding: "proflist",
  claddingThk: undefined,
  roofing: "proflist",
  roofingThk: undefined,
  foundation: "none",
});
assert.ok(coldHangar.totals.final > 0);
assert.equal(coldHangar.input.cladding, "proflist");

const warmWarehouse = estimate();
assert.ok(warmWarehouse.totals.final > 0);
assert.equal(warmWarehouse.complexity, "TYPICAL");

for (const foundation of ["none", "slab_200", "strip", "pile_screw"] as FoundationType[]) {
  const result = estimate({ foundation });
  assert.ok(result.totals.final > 0, `foundation ${foundation} should produce a price`);
}

assertEngineer({ length: 130, width: 30 }, "very_large_object");
assertEngineer({ region: "krsk_taymyr", foundation: "pile_screw" }, "permafrost");
assertEngineer({ region: "tuva" }, "high_seismic");
assertEngineer({ craneCapacityT: 10 }, "overhead_crane");
assertEngineer({ craneCapacityT: 20 }, "overhead_crane");
assertEngineer({ region: "unknown-region" }, "unsupported_region");
assertEngineer({
  objectType: "tent_arched",
  cladding: "none",
  claddingThk: undefined,
  roofing: "proflist",
  roofingThk: undefined,
  foundation: "none",
}, "non_standard_envelope");

console.log("calculator edge cases passed");

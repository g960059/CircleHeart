import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileExecutionPlanV1 } from "@/engine/executionPlan/ExecutionPlanCompilerV1";
import { createCardiorespiratoryColdStateV1 } from "@/engine/cardiorespiratory/CardiorespiratorySessionV1";
import { createCardiorespiratoryModelDefinitionV1, createCardiorespiratoryNumericalPolicyV1 } from "@/engine/cardiorespiratory/CardiorespiratoryModelDefinitionV1";

const args = new Set(process.argv.slice(2));
for (const arg of args) if (arg !== "--summary" && arg !== "--write") throw new Error(`Unsupported compiler argument ${arg}`);
const plan = compileExecutionPlanV1(createCardiorespiratoryModelDefinitionV1(createCardiorespiratoryColdStateV1().cardiorespiratory), createCardiorespiratoryNumericalPolicyV1());
const json = `${JSON.stringify(plan)}\n`;
if (args.has("--write")) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const output = path.join(root, "engine/cardiorespiratory/CardiorespiratoryExecutionPlanV1.generated.json");
  writeFileSync(output, json, "utf8");
  process.stderr.write(`Wrote ${path.relative(root, output)}\n`);
} else process.stdout.write(json);
if (args.has("--summary")) process.stderr.write(`ExecutionPlan ${plan.definitionId}: ${plan.stateLayout.logicalSlotCount} logical slots, ${plan.hydraulicGraph.nodeIds.length} nodes, ${plan.hydraulicGraph.pathIds.length} paths, ${plan.solveGroups[0]?.activeUnknownCount} active unknowns\n`);

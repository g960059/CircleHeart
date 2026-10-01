export const CARDIORESPIRATORY_MODEL_DEFINITION_V1_ID = "cardiorespiratory-model-definition-v1" as const;
export const CARDIORESPIRATORY_NUMERICAL_POLICY_V1_ID = "cardiorespiratory-conservative-partitioned-policy-v1" as const;
export const CARDIORESPIRATORY_UPDATE_GROUP_V1_ID = "cardiorespiratory-conservative-partitioned-step" as const;
export const CARDIORESPIRATORY_PULMONARY_PATH_KERNEL_V1_ID = "pulmonary-flow/regional-waterfall-v1" as const;
export const CARDIORESPIRATORY_PULMONARY_PATH_IDS_V1 = Object.freeze(["PCap_PVen.unit1", "PCap_PVen.unit2"] as const);

/** Accepted owners advanced atomically by the exact model's partitioned step. */
export const CARDIORESPIRATORY_STATE_OWNERS_V1 = Object.freeze([
  { root: "respiratory", componentId: "respiratory-mechanics", kernelId: "respiratory-conserved-gas-mechanics-kernel-v1" },
  { root: "blood", componentId: "blood-gas-transport", kernelId: "blood-gas-conservative-advection-kernel-v1" },
  { root: "systemic", componentId: "systemic-tissue-gas", kernelId: "tissue-gas-exchange-kernel-v1" },
  { root: "myocardium", componentId: "myocardial-tissue-gas", kernelId: "tissue-gas-exchange-kernel-v1" },
  { root: "ledger", componentId: "cardiorespiratory-conservation-ledger", kernelId: "cardiorespiratory-conservation-ledger-kernel-v1" },
  { root: "readback", componentId: "cardiorespiratory-accepted-readback", kernelId: "cardiorespiratory-accepted-readback-kernel-v1" },
  { root: "hemodynamicReadback", componentId: "hemodynamic-accepted-readback", kernelId: "cardiorespiratory-accepted-readback-kernel-v1" },
] as const);

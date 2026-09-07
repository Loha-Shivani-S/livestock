import {
  getCommandData as getCommandDataFn,
  searchAnimals as searchAnimalsFn,
  getAnimalDossier as getAnimalDossierFn,
  createLabRequisition as createLabRequisitionFn,
  getLabRequisitions as getLabRequisitionsFn,
  getLabRequisitionByToken as getLabRequisitionByTokenFn,
  updateLabResult as updateLabResultFn,
  recordGatewayHeartbeat as recordGatewayHeartbeatFn,
  getAlertRecipients as getAlertRecipientsFn,
  saveAlertRecipient as saveAlertRecipientFn,
  deleteAlertRecipient as deleteAlertRecipientFn,
  testAlertRecipient as testAlertRecipientFn,
  getNotificationsHistory as getNotificationsHistoryFn,
  submitFieldReport as submitFieldReportFn,
  ingestTelemetry as ingestTelemetryFn,
  getIngestConfig as getIngestConfigFn,
  registerAnimal as registerAnimalFn,
  getSupabaseDiagnostics as getSupabaseDiagnosticsFn,
} from "./data";

export async function getCommandData() {
  return getCommandDataFn({ data: undefined });
}

export async function searchAnimals(input: { q: string }) {
  return searchAnimalsFn({ data: input });
}

export async function getAnimalDossier(input: { tagId: string }) {
  return getAnimalDossierFn({ data: input });
}

export async function createLabRequisition(input: {
  tag_id?: string;
  alert_id?: string;
  sample_type: string;
  laboratory?: string;
  collected_by?: string;
}) {
  return createLabRequisitionFn({ data: input });
}

export async function getLabRequisitions() {
  return getLabRequisitionsFn({ data: undefined });
}

export async function getLabRequisitionByToken(input: { query: string }) {
  return getLabRequisitionByTokenFn({ data: input });
}

export async function updateLabResult(input: {
  requisition_id: string;
  diagnostic_test: string;
  pathogen: string;
  result_status: "positive" | "negative" | "inconclusive";
  findings: string;
  reported_by?: string;
}) {
  return updateLabResultFn({ data: input });
}

export async function recordGatewayHeartbeat(input: {
  node_id: string;
  online?: boolean;
  queued?: number;
  rssi?: number;
  snr?: number;
  battery_pct?: number;
  firmware_v?: string;
}) {
  return recordGatewayHeartbeatFn({ data: input });
}

export async function getAlertRecipients() {
  return getAlertRecipientsFn({ data: undefined });
}

export async function saveAlertRecipient(input: {
  id?: string | undefined;
  full_name: string;
  designation: string;
  phone?: string | undefined;
  email?: string | undefined;
  district?: string | undefined;
  block?: string | undefined;
  active?: boolean | undefined;
}) {
  return saveAlertRecipientFn({ data: input });
}

export async function deleteAlertRecipient(input: { id: string }) {
  return deleteAlertRecipientFn({ data: input });
}

export async function testAlertRecipient(input: { recipient_id: string }) {
  return testAlertRecipientFn({ data: input });
}

export async function getNotificationsHistory() {
  return getNotificationsHistoryFn({ data: undefined });
}

export async function submitFieldReport(input: {
  tag_id?: string | undefined;
  species: string;
  village: string;
  symptoms: string[];
  affected_count: number;
  mortality_count: number;
  notes?: string | undefined;
  voice_transcript?: string | undefined;
  language?: string | undefined;
  block?: string | undefined;
  district?: string | undefined;
  lat?: number | undefined;
  lon?: number | undefined;
  channel?: string | undefined;
}) {
  return submitFieldReportFn({ data: input });
}

export async function ingestTelemetry(input: {
  node_id?: string;
  tag_id: string;
  temp: number;
  heart_rate: number;
  ax: number;
  ay: number;
  az: number;
  lat?: number;
  lon?: number;
  speed: number;
  thi?: number;
}) {
  return ingestTelemetryFn({ data: input });
}

export async function getIngestConfig() {
  return getIngestConfigFn({ data: undefined });
}

export async function registerAnimal(input: {
  tag_id: string;
  species?: string;
  breed?: string;
  sex?: string;
  date_of_birth?: string;
  owner_name: string;
  owner_phone?: string;
  village: string;
  block?: string;
  district?: string;
  lat?: number;
  lon?: number;
  collar_node_id?: string;
}) {
  return registerAnimalFn({ data: input });
}

export async function getSupabaseDiagnostics() {
  return getSupabaseDiagnosticsFn({ data: undefined });
}

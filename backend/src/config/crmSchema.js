
const CRM_FIELDS = [
  { key: "created_at", description: "Lead creation date/time. Must be parseable by JS `new Date(...)`.", required: false },
  { key: "name", description: "Lead's full name.", required: false },
  { key: "email", description: "Primary email address.", required: false },
  { key: "country_code", description: "Phone country code, e.g. +91.", required: false },
  { key: "mobile_without_country_code", description: "Mobile number without the country code.", required: false },
  { key: "company", description: "Company name.", required: false },
  { key: "city", description: "City.", required: false },
  { key: "state", description: "State/province.", required: false },
  { key: "country", description: "Country.", required: false },
  { key: "lead_owner", description: "Email or name of the salesperson/owner assigned to this lead.", required: false },
  { key: "crm_status", description: "One of CRM_STATUS_VALUES. Leave blank if no confident match.", required: false },
  { key: "crm_note", description: "Remarks, follow-ups, extra emails/phones, anything that doesn't fit another field.", required: false },
  { key: "data_source", description: "One of DATA_SOURCE_VALUES. Leave blank if no confident match.", required: false },
  { key: "possession_time", description: "Property possession time, if applicable (real estate leads).", required: false },
  { key: "description", description: "Additional free-text description.", required: false },
];

const CRM_STATUS_VALUES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
];

const DATA_SOURCE_VALUES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
];

const CRM_FIELD_KEYS = CRM_FIELDS.map((f) => f.key);

module.exports = {
  CRM_FIELDS,
  CRM_FIELD_KEYS,
  CRM_STATUS_VALUES,
  DATA_SOURCE_VALUES,
};
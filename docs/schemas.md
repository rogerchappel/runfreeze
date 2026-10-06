# Versioned JSON Schemas

The schemas in [`../schemas/`](../schemas/) describe the configuration accepted by
`runfreeze.yaml` and the schema-1 JSON evidence report. They use JSON Schema
Draft 2020-12; YAML configuration is parsed as JSON data before applying the
configuration schema. The config schema reflects parser defaults: omitted
`root`, `id`, `allowFailure`, `allow`, `redact`, and global limits are permitted.

- [Configuration](../schemas/runfreeze-config.schema.json)
- [Schema-1 evidence report](../schemas/evidence-report.schema.json)

The report schema describes field-level structure. JSON Schema cannot express
all cross-field invariants; `runfreeze verify` additionally checks summary
counts against commands and each redaction total against its `byPattern` sum.
The verifier's runtime rules are authoritative. A representative configuration
is available at [`../examples/runfreeze.yaml`](../examples/runfreeze.yaml).

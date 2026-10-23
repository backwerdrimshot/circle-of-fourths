import { createMeasurementClient } from "/brs-measurement.js";
// Review-only preparation. Do not enable without accepted policy, registry,
// separate collector bindings/limiter and explicit release authorization.
const config = Object.freeze({
  id: "app:circle-of-fourths", origin: "https://circle-of-fourths.backwerdrhythmshop.com", path: "/",
  mode: "student-protective", enabled: false, operationalApproved: false,
  sponsorApproved: false, placements: [],
});
createMeasurementClient(config).open();

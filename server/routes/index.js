import { registerCoreRoutes } from "./core.js";
import { registerPatientRoutes } from "./patients.js";
import { registerTherapyRoutes } from "./therapy.js";

export const registerRoutes = (app, deps) => {
  registerCoreRoutes(app, deps);
  registerPatientRoutes(app, deps);
  registerTherapyRoutes(app, deps);
};

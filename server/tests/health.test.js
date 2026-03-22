import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

describe("health check", () => {
  it("returns ok for root", async () => {
    const app = createApp({ skipDb: true });
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, service: "speech-therapy-backend" });
  });

  it("returns 404 for unknown routes", async () => {
    const app = createApp({ skipDb: true });
    const res = await request(app).get("/nope");
    expect(res.status).toBe(404);
  });
});

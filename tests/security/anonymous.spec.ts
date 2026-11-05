import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createAnonClient, service } from "./helpers";

async function userExists(email: string): Promise<boolean> {
  const perPage = 200;
  for (let page = 1; ; page++) {
    const { data, error } = await service.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;
    if (data.users.some((u) => u.email === email)) return true;
    if (data.users.length < perPage) return false;
  }
}

describe("anonymous access", () => {
  describe("select", () => {
    it.each([
      "profiles",
      "objects",
      "tasks",
      "task_history",
      "task_status_transitions",
    ])("should fail with 42501 when anon reads %s", async (table) => {
      const { data, error } = await createAnonClient().from(table).select("*");

      expect(error?.code).toBe("42501");
      expect(data).toBeNull();
    });
  });

  describe("insert", () => {
    it.each<[string, () => Record<string, unknown>]>([
      ["objects", () => ({ name: "anon", address: "anon" })],
      [
        "tasks",
        () => ({
          object_id: randomUUID(),
          title: "anon",
          assignee_id: randomUUID(),
        }),
      ],
      [
        "task_history",
        () => ({
          task_id: randomUUID(),
          task_title: "anon",
          object_name: "anon",
          event: "created",
        }),
      ],
      [
        "profiles",
        () => ({ id: randomUUID(), full_name: "anon", role: "manager" }),
      ],
    ])(
      "should fail with 42501 when anon inserts into %s",
      async (table, row) => {
        const { error } = await createAnonClient().from(table).insert(row());

        expect(error?.code).toBe("42501");
      },
    );
  });

  describe("rpc", () => {
    it("should fail with 42501 when anon calls transition_task", async () => {
      const { error } = await createAnonClient().rpc("transition_task", {
        p_task_id: randomUUID(),
        p_to_status: "in_progress",
        p_comment: null,
      });

      expect(error?.code).toBe("42501");
    });

    it("should fail with 42501 when anon calls current_user_role", async () => {
      const { error } = await createAnonClient().rpc("current_user_role");

      expect(error?.code).toBe("42501");
    });
  });

  describe("auth.signUp", () => {
    it("should fail with signup_disabled and create no user when anon signs up", async () => {
      const email = `signup-${randomUUID()}@security.test`;

      const { data, error } = await createAnonClient().auth.signUp({
        email,
        password: randomUUID(),
      });

      expect(error?.code).toBe("signup_disabled");
      expect(data.session).toBeNull();
      expect(await userExists(email)).toBe(false);
    });
  });
});

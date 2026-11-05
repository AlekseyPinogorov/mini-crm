import { beforeAll, describe, expect, it } from "vitest";
import { service, setupUsers, type Users } from "./helpers";

describe("task_status_transitions", () => {
  let users: Users;
  const actors = ["manager", "executorA"] as const;

  const snapshot = async () => {
    const { data, error } = await service
      .from("task_status_transitions")
      .select("*")
      .order("from_status")
      .order("to_status");
    if (error) throw error;
    return data;
  };

  beforeAll(async () => {
    users = await setupUsers();
  });

  describe("insert", () => {
    it.each(actors)(
      "should reject with 42501 and add nothing when %s inserts a rule",
      async (actor) => {
        const before = await snapshot();

        const { error } = await users[actor].client
          .from("task_status_transitions")
          .insert({
            from_status: "accepted",
            to_status: "new",
            actor_role: "executor",
            comment_required: false,
          })
          .select();

        expect(error?.code).toBe("42501");
        expect(await snapshot()).toEqual(before);
      },
    );
  });

  describe("update", () => {
    it.each(actors)(
      "should reject with 42501 and keep rules when %s edits a rule",
      async (actor) => {
        const before = await snapshot();

        const { error } = await users[actor].client
          .from("task_status_transitions")
          .update({ actor_role: "executor" })
          .eq("from_status", "review")
          .eq("to_status", "accepted")
          .select();

        expect(error?.code).toBe("42501");
        expect(await snapshot()).toEqual(before);
      },
    );
  });

  describe("delete", () => {
    it.each(actors)(
      "should reject with 42501 and keep rules when %s deletes a rule",
      async (actor) => {
        const before = await snapshot();

        const { error } = await users[actor].client
          .from("task_status_transitions")
          .delete()
          .eq("from_status", "new")
          .select();

        expect(error?.code).toBe("42501");
        expect(await snapshot()).toEqual(before);
      },
    );
  });
});

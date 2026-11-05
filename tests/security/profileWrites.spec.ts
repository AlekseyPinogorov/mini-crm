import { beforeAll, describe, expect, it } from "vitest";
import { service, setupUsers, type Users } from "./helpers";

describe("profiles", () => {
  let users: Users;

  beforeAll(async () => {
    users = await setupUsers();
  });

  describe("insert", () => {
    it("should reject with 42501 and create no profile when user without profile claims manager", async () => {
      const { error } = await users.noProfile.client
        .from("profiles")
        .insert({
          id: users.noProfile.id,
          full_name: "impostor",
          role: "manager",
        })
        .select();

      expect(error?.code).toBe("42501");
      const { data } = await service
        .from("profiles")
        .select("id")
        .eq("id", users.noProfile.id);
      expect(data).toEqual([]);
    });
  });

  describe("update", () => {
    it("should reject with 42501 and keep the role when manager changes another profile role", async () => {
      const { error } = await users.manager.client
        .from("profiles")
        .update({ role: "manager" })
        .eq("id", users.executorA.id)
        .select();

      expect(error?.code).toBe("42501");
      const { data } = await service
        .from("profiles")
        .select("role")
        .eq("id", users.executorA.id)
        .single();
      expect(data?.role).toBe("executor");
    });
  });

  describe("delete", () => {
    it("should reject with 42501 and keep the profile when manager deletes a profile", async () => {
      const { error } = await users.manager.client
        .from("profiles")
        .delete()
        .eq("id", users.executorB.id)
        .select();

      expect(error?.code).toBe("42501");
      const { data } = await service
        .from("profiles")
        .select("id")
        .eq("id", users.executorB.id);
      expect(data).toHaveLength(1);
    });
  });
});

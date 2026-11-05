import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createObject,
  createTask,
  service,
  setupUsers,
  type Users,
} from "./helpers";

describe("objects", () => {
  let users: Users;
  let visible: { id: string; name: string };

  const row = () => ({
    name: `object-${randomUUID()}`,
    address: "Test street 1",
  });
  const countByName = async (name: string) => {
    const { data } = await service
      .from("objects")
      .select("id")
      .eq("name", name);
    return data!.length;
  };

  beforeAll(async () => {
    users = await setupUsers();
    visible = await createObject(users.manager);
    await createTask(users.manager, visible.id, users.executorA.id);
  });

  describe("insert", () => {
    it("should reject with 42501 and create nothing when executor inserts", async () => {
      const payload = row();

      const { error } = await users.executorA.client
        .from("objects")
        .insert(payload)
        .select();

      expect(error?.code).toBe("42501");
      expect(await countByName(payload.name)).toBe(0);
    });

    it("should reject with 42501 and create nothing when user without profile inserts", async () => {
      const payload = row();

      const { error } = await users.noProfile.client
        .from("objects")
        .insert(payload)
        .select();

      expect(error?.code).toBe("42501");
      expect(await countByName(payload.name)).toBe(0);
    });

    it.each<[string, () => Record<string, unknown>]>([
      ["created_by", () => ({ created_by: users.manager2.id })],
      ["created_at", () => ({ created_at: "2000-01-01T00:00:00Z" })],
    ])(
      "should reject with 42501 and create nothing when manager sends %s",
      async (_name, extra) => {
        const payload = { ...row(), ...extra() };

        const { error } = await users.manager.client
          .from("objects")
          .insert(payload)
          .select();

        expect(error?.code).toBe("42501");
        expect(await countByName(payload.name)).toBe(0);
      },
    );

    it("should reject with 23514 and create nothing when manager sends a whitespace-only name", async () => {
      const { error } = await users.manager.client
        .from("objects")
        .insert({ name: "\n\t", address: "Test street 1" })
        .select();

      expect(error?.code).toBe("23514");
      expect(await countByName("\n\t")).toBe(0);
    });

    it("should set created_by to the caller when client sends neither", async () => {
      const { data, error } = await users.manager.client
        .from("objects")
        .insert(row())
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.created_by).toBe(users.manager.id);
    });
  });

  describe("update", () => {
    it("should affect no rows and keep the name when executor edits a visible object", async () => {
      const { data, error } = await users.executorA.client
        .from("objects")
        .update({ name: "hacked" })
        .eq("id", visible.id)
        .select();

      expect(error).toBeNull();
      expect(data).toEqual([]);
      const { data: current } = await service
        .from("objects")
        .select("name")
        .eq("id", visible.id)
        .single();
      expect(current?.name).toBe(visible.name);
    });
  });

  describe("delete", () => {
    it("should affect no rows and keep the object when executor deletes a visible object", async () => {
      const { data, error } = await users.executorA.client
        .from("objects")
        .delete()
        .eq("id", visible.id)
        .select();

      expect(error).toBeNull();
      expect(data).toEqual([]);
      expect(await countByName(visible.name)).toBe(1);
    });
  });
});

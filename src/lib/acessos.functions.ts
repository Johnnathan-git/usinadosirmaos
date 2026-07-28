import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ManagedUser = {
  id: string;
  email: string;
  name: string;
  created_at: string;
  is_admin: boolean;
  permissions: string[];
};

async function assertEffectiveAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("is_effective_admin", { _user_id: userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado: apenas administradores.");
}

export const listManagedUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ users: ManagedUser[]; bootstrap: boolean }> => {
    await assertEffectiveAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(error.message);
    const [{ data: roles }, { data: perms }, { data: bootRaw }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id,role"),
      supabaseAdmin.from("user_permissions").select("user_id,module"),
      supabaseAdmin.rpc("is_bootstrap_mode"),
    ]);
    const adminSet = new Set((roles ?? []).filter((r: any) => r.role === "admin").map((r: any) => r.user_id));
    const permMap = new Map<string, string[]>();
    (perms ?? []).forEach((p: any) => {
      const arr = permMap.get(p.user_id) ?? [];
      arr.push(p.module);
      permMap.set(p.user_id, arr);
    });
    const users: ManagedUser[] = list.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      name: (u.user_metadata as any)?.name ?? "",
      created_at: u.created_at,
      is_admin: adminSet.has(u.id),
      permissions: permMap.get(u.id) ?? [],
    }));
    return { users, bootstrap: Boolean(bootRaw) };
  });

export const createManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; password: string; name: string; is_admin: boolean; permissions: string[] }) => d)
  .handler(async ({ data, context }) => {
    await assertEffectiveAdmin(context.supabase, context.userId);
    if (!data.email || !data.password || data.password.length < 6) {
      throw new Error("Informe email e senha (mínimo 6 caracteres).");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.trim(),
      password: data.password,
      email_confirm: true,
      user_metadata: { name: (data.name ?? "").trim() },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar usuário.");
    const uid = created.user.id;
    if (data.is_admin) {
      await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "admin" });
    }
    if (data.permissions.length) {
      await supabaseAdmin.from("user_permissions").insert(
        data.permissions.map((m) => ({ user_id: uid, module: m })),
      );
    }
    return { id: uid };
  });

export const updateManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; is_admin: boolean; permissions: string[]; password?: string; name?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertEffectiveAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.password && data.password.length >= 6) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: data.password });
      if (error) throw new Error(error.message);
    }

    if (typeof data.name === "string") {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { user_metadata: { name: data.name.trim() } });
      if (error) throw new Error(error.message);
    }

    // sync admin role
    if (data.is_admin) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: data.user_id, role: "admin" }, { onConflict: "user_id,role" });
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id).eq("role", "admin");
    }

    // sync permissions (replace)
    await supabaseAdmin.from("user_permissions").delete().eq("user_id", data.user_id);
    if (data.permissions.length) {
      await supabaseAdmin.from("user_permissions").insert(
        data.permissions.map((m) => ({ user_id: data.user_id, module: m })),
      );
    }
    return { ok: true };
  });

export const deleteManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertEffectiveAdmin(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("Você não pode excluir sua própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [rolesRes, permsRes, bootRes] = await Promise.all([
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      context.supabase.from("user_permissions").select("module").eq("user_id", context.userId),
      context.supabase.rpc("is_bootstrap_mode"),
    ]);
    const is_admin = (rolesRes.data ?? []).some((r: any) => r.role === "admin");
    const bootstrap = Boolean(bootRes.data);
    return {
      is_admin,
      bootstrap,
      effective_admin: is_admin || bootstrap,
      permissions: (permsRes.data ?? []).map((p: any) => p.module as string),
    };
  });
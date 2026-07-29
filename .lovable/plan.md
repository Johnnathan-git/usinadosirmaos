# Reativar login para usuários cadastrados

Hoje o app está com o login desativado (todo mundo entra direto no Dashboard como "Acesso livre") e as funções do módulo Acessos rodam sem exigir sessão. Por isso o usuário que você cadastrou não tem por onde "entrar" — não existe tela pedindo email/senha.

Para que o usuário cadastrado consiga logar com o email e senha que você definiu, precisamos religar o fluxo de autenticação.

## O que fazer

1. **Reativar o gate de autenticação em `src/components/AppLayout.tsx`**
   - Voltar a checar `supabase.auth.getSession()` e redirecionar para `/auth` quando não houver sessão.
   - Voltar a chamar `getMyAccess` para filtrar a navegação e bloquear módulos sem permissão.
   - Restaurar o botão **Sair** no cabeçalho (com `signOut` + limpeza do cache), mantendo o redirect para `/auth?manual=1` para não disparar o atalho de auto-login do dono.

2. **Restaurar a proteção das funções do módulo Acessos em `src/lib/acessos.functions.ts`**
   - Voltar a usar `.middleware([requireSupabaseAuth])` em `listManagedUsers`, `createManagedUser`, `updateManagedUser`, `deleteManagedUser` e `getMyAccess`.
   - Reintroduzir o `assertEffectiveAdmin` para que só administradores criem/editem/excluam usuários.
   - `getMyAccess` volta a devolver `is_admin`, `permissions` e `client_id` reais da sessão.

3. **Manter a tela `/auth` como está** (login + "Esqueci minha senha" + atalho "Este é meu acesso — pular login neste dispositivo" para o dono). O usuário novo entra normalmente com o email/senha cadastrados; só o dono usa o atalho.

4. **Confirmar as configurações do Supabase Auth**
   - `disable_signup: true` (continua desativado — só admin cria usuário pelo módulo Acessos).
   - `auto_confirm_email: true` (usuário cadastrado pelo admin já entra sem precisar confirmar email).

## Como o usuário cadastrado vai entrar depois

1. Você abre o app e cai na tela `/auth`.
2. Passa o link/endereço para o usuário.
3. Ele digita o email e a senha que você cadastrou em **Acessos → Novo usuário** e clica **Entrar**.
4. Ele verá só os módulos marcados para ele (e, no Resultado, só o cliente vinculado).

## Detalhes técnicos

- `AppLayout`: reintroduz o `useEffect` de sessão, o estado `ready`, o `useQuery(["my-access"], getMyAccess)`, o filtro de `visibleNav` por `access.permissions` e a tela "Acesso restrito" para rotas bloqueadas.
- `acessos.functions.ts`: reverte para a versão com middleware; sem sessão a chamada devolve 401, o que é o comportamento esperado agora que existe login.
- `start.ts` já registra `attachSupabaseAuth` em `functionMiddleware`, então o bearer token é anexado automaticamente após o login — nenhuma mudança necessária.
- Nenhuma migration de banco é necessária; as tabelas `user_roles`, `user_permissions` e `user_clients` já existem com as policies corretas.

# Aplicativo mobile — Usina dos Irmãos

Esta pasta é isolada da aplicação web principal. Alterações aqui não mudam o build do Lovable/TanStack Start.

## Arquitetura atual

O sistema principal usa TanStack Start e possui funções executadas no servidor. Por isso, nesta primeira etapa o aplicativo nativo usa Capacitor e carrega a versão publicada e estável:

- https://usinadosirmaos.lovable.app

Isso preserva login, Supabase, downloads e funções server-side sem duplicar regras de negócio.

## Identificação do aplicativo

- Nome: Usina dos Irmãos
- App ID: br.com.usinadosirmaos.app
- Capacitor: 8.5.3

## Preparação local

Requer Node 22+.

```bash
cd mobile
npm install
npm run android:add
npm run ios:add
npm run sync
```

Android pode ser aberto com:

```bash
npm run open:android
```

iOS requer macOS + Xcode e pode ser aberto com:

```bash
npm run open:ios
```

## Próximas etapas antes das lojas

1. Gerar e validar Android em aparelho real.
2. Gerar e validar iOS/TestFlight.
3. Criar ícone e splash finais.
4. Adicionar recursos nativos úteis (ex.: biometria e notificações).
5. Configurar assinatura Android e Apple Developer.
6. Preparar política de privacidade e metadados das lojas.

A pasta `www` contém apenas uma tela de contingência. O sistema de produção continua sendo mantido pelo projeto principal.

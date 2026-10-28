# iPhone / TestFlight

O projeto iOS do Usina dos Irmãos é gerado a partir da pasta mobile com Capacitor.

## O que já pode ser validado sem conta Apple Developer

O workflow `Mobile iOS - validação` gera o projeto iOS e compila para o simulador usando Xcode 26. Isso confirma que a camada iOS está tecnicamente válida sem alterar o sistema web.

## Para instalar em um iPhone físico

A Apple exige assinatura do aplicativo. Para o fluxo definitivo, a distribuição será feita pelo TestFlight.

Será necessário:

1. Uma conta inscrita no Apple Developer Program.
2. Criar o aplicativo no App Store Connect com o Bundle ID `br.com.usinadosirmaos.app`.
3. Gerar/autorizar a assinatura do app na conta Apple.
4. Enviar o build assinado para o App Store Connect.
5. Instalar pelo TestFlight no iPhone.

O sistema web e o Supabase permanecem os mesmos. O aplicativo mobile é uma camada separada.

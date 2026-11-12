# Joy Store 520 — sistema v0.3 para instalação manual

**Estado:** código preparado e testado localmente; ainda não publicado nem homologado na Cloudflare. Este pacote substitui a etapa demonstrativa por uma aplicação com API, login e banco central. Abra `COMECE-AQUI.html` para o roteiro de instalação.

A publicação será feita pelo proprietário, em um novo repositório/conta GitHub da Joy Store. Não há ligação configurada com o GitHub conectado ao ChatGPT. Não foram criados serviços, domínios, usuários de produção ou bancos remotos.

## Pastas

| Pasta/arquivo | Uso |
|---|---|
| `docs/` | Catálogo público pronto para GitHub Pages, após configurar a origem da API. |
| `public/` | Catálogo e painel servidos pelo Worker; contém HTML, JavaScript e estilos. |
| `src/` | API e autenticação do Worker. |
| `migrations/` | Estrutura do banco D1. Não contém produtos ou contas de teste. |
| `wrangler.jsonc` | Configuração de publicação; preencher o ID real do banco. |
| `tests/` | Testes da API com adaptador SQLite local. |
| `scripts/dev.mjs` | Ambiente local efêmero de QA, com duas peças fictícias e conta temporária. Não é servidor de produção. |

## Funções implementadas

- Login individual, sessão expira em 12 horas, logout e alteração da própria senha.
- Perfis proprietária, gerente, vendedora e estoque. Autorização feita no servidor.
- Cadastro/ativação/desativação de pessoas pela proprietária; desativar revoga sessões.
- Produtos com preço, custo, foto por URL HTTPS, cor, tamanho e estoque.
- Vendas presenciais e WhatsApp; pagamentos integrais, pendentes ou parciais.
- Recebimentos posteriores, recibos imprimíveis com histórico e saldo.
- Cancelamento por proprietária/gerente, com motivo e reposição do estoque. Não efetua estorno bancário.
- Movimentações de estoque e auditoria das alterações.
- Atualização do painel a cada 30 segundos. O servidor confere estoque no fechamento.
- Proteção transacional contra estoque negativo e pagamento acima do saldo.
- Identificador de operação para repetir uma requisição sem duplicar o registro.
- Catálogo público sem custos, clientes, senhas ou dados financeiros.
- Manifesto PWA. Vendas exigem conexão; dados de clientes não são cacheados pelo service worker.

## Permissões

| Perfil | Permissões |
|---|---|
| Proprietária | Vendas, recebimentos, cancelamentos, produtos, estoque, financeiro, auditoria, configuração e equipe. |
| Gerente | Gestão comercial/estoque/financeiro e auditoria, sem administrar acessos. |
| Vendedora | Registra e recebe suas próprias vendas; consulta catálogo/estoque disponível. Sem custos de aquisição, financeiro global ou cancelamentos. |
| Estoque | Consulta produtos e registra variações/movimentações; não acessa clientes, vendas ou custos. |

## Instalação manual — ordem

1. Crie o novo repositório da Joy Store e envie o conteúdo desta pasta para a raiz dele. Não envie apenas o ZIP. `package.json`, `wrangler.jsonc`, `src`, `public` e `docs` devem aparecer na raiz.
2. Instale Node.js LTS compatível com Wrangler e abra um terminal nesta pasta, no seu computador.
3. Execute `npm install`, depois `npm test` e `npx wrangler login`. Selecione sua conta Cloudflare correta.
4. Execute `npx wrangler d1 create joy-store-520`. Copie o `database_id` retornado para o campo correspondente em `wrangler.jsonc`, substituindo `SUBSTITUIR_PELO_ID_DO_D1`.
5. Execute `npx wrangler d1 migrations apply joy-store-520 --remote` e confirme apenas o banco novo. O esquema vazio será criado.
6. Execute `npx wrangler deploy`. A API de login permanecerá indisponível até os segredos do próximo passo serem cadastrados. Anote a URL HTTPS real retornada; não invente um domínio.
7. Gere dois valores aleatórios diferentes de pelo menos 32 caracteres em um gerenciador de senhas. Execute `npx wrangler secret put AUTH_PEPPER` e informe o primeiro. Execute `npx wrangler secret put SETUP_TOKEN` e informe o segundo. Guarde o AUTH_PEPPER com segurança: perdê-lo/alterá-lo invalida a verificação das senhas existentes. Não coloque valores secretos no GitHub, no ZIP, no JavaScript público ou no chat.
8. Acesse `/setup.html` na URL real do Worker. Informe o SETUP_TOKEN, nome, e-mail e senha da proprietária. A configuração só pode ser feita uma vez; não existe senha padrão de produção.
9. Depois que sua conta for criada, execute `npx wrangler secret delete SETUP_TOKEN`. O código de configuração deixa de ser necessário. Não remova AUTH_PEPPER.
10. Acesse `/painel.html`, faça login e cadastre seus dados reais. A base remota começa vazia. O protótipo antigo não é importado automaticamente.
11. Em `docs/catalog-config.js`, coloque a origem HTTPS do Worker em `window.JOY_API_ORIGIN`, sem barra no final. Exemplo apenas ilustrativo: `https://seu-worker.seu-subdominio.workers.dev`.
12. No repositório novo, vá a Settings → Pages → Deploy from a branch → branch `main` → pasta `/docs`. Salve. Após a publicação, anote a URL que o GitHub realmente fornecer.
13. Em `wrangler.jsonc`, defina `CATALOG_ORIGIN` como a origem da vitrine, sem caminho e sem barra final. Para uma URL `https://usuario.github.io/joystore/`, a origem é `https://usuario.github.io`. Para domínio próprio é a origem HTTPS desse domínio. Execute `npx wrangler deploy` novamente.
14. Envie os arquivos alterados ao repositório. O catálogo já pode consultar a API; “Acesso da equipe” abre o Worker. O painel não deve ser aberto pelo GitHub Pages.
15. Antes de usar em vendas reais, faça o teste de homologação abaixo na hospedagem publicada.

O domínio próprio pode ser configurado depois. Não há necessidade de comprar um domínio para fazer a primeira homologação. Custos e limites do plano Cloudflare devem ser conferidos na conta; nenhum plano pago foi contratado por este projeto.

## Homologação antes das vendas reais

- Confirme login e logout; visitante sem sessão não acessa `/api/state`.
- Cadastre uma vendedora e uma pessoa de estoque. Verifique as permissões com cada conta.
- Cadastre uma peça de teste, preço R$ 189,90 e uma unidade. Faça uma venda com desconto de R$ 9,90, entrada R$ 50 e saldo R$ 130.
- Quite os R$ 130 e confira o recibo. Tente receber acima do saldo: a API deve recusar.
- Em dois aparelhos, tente vender simultaneamente a última peça. Só uma venda deve confirmar.
- Cancele uma venda como proprietária/gerente e confirme que a peça voltou uma única vez.
- Teste catálogo no GitHub Pages, WhatsApp, instalação PWA e impressão no celular.
- Confirme backup/restauração do D1 e consumo/limite de CPU do login no plano contratado. Os testes locais não comprovam o comportamento do runtime remoto.

## O que ainda não está incluído

- Recuperação de senha por e-mail, autenticação em dois fatores e convite automático por e-mail.
- Emissão fiscal, gateway de pagamento, estorno bancário automático ou conciliação com banco/cartão.
- Trocas/devoluções parciais, comissão e múltiplas lojas.
- Upload direto de fotos para R2; nesta versão usa URL HTTPS ou arquivo em assets.
- Edição/exclusão de produtos já cadastrados; é possível cadastrar variações e ajustar estoque.
- Rotina automática de backup e importação de dados do protótipo.

Histórico: período inicial de 30 dias, até 500 vendas exibidas; reduza o período para localizar anteriores. Totais financeiros incluem todas as vendas criadas no período e seus recebimentos, inclusive posteriores. Não representam o fluxo de caixa por data do pagamento. Vendas canceladas são excluídas dos totais; seus recebimentos permanecem no histórico para conferência de estorno. A margem é estimada, não lucro líquido.

Se houver falha de conexão durante uma confirmação, confira o histórico antes de recriar a operação. O identificador de repetição é mantido durante a sessão da página; fechar/recarregar a página perde esse identificador. O sistema não registra vendas offline.

## Testes locais

Com Node.js >=22.13: `npm test`. Os testes usam SQLite e um adaptador compatível com os métodos D1 utilizados; não substituem testes no D1 real. Foram testados login/CSRF, permissões, isolamento de vendedoras, idempotência, concorrência da última peça, concorrência de recebimentos, cancelamento e revogação de acesso.

`npm run dev` inicia exclusivamente um ambiente local de QA. Acesse `http://localhost:4173/__qa` para usar a conta temporária no navegador. A rota de QA existe apenas nesse servidor de teste; não existe em `src/worker.mjs`. O banco e as credenciais são recriados a cada execução. Não exponha o servidor de QA na internet e não cadastre clientes reais nele.

`npm run catalog` recompõe `docs/` a partir dos arquivos públicos e sobrescreve `docs/catalog-config.js`; reconfigure a origem da API após executar.

## Referências de instalação

- [Cloudflare D1: comandos e migrações](https://developers.cloudflare.com/workers/wrangler/commands/d1/)
- [Configuração do Wrangler e assets](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [GitHub Pages: fonte de publicação](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

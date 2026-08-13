# Maintenance Car API

API multiusuário para organizar veículos, histórico e agenda de manutenções,
avisar sobre serviços vencidos e acompanhar os custos mensais e anuais.

Este documento define o escopo e o plano inicial do produto. A primeira versão
será somente backend, construída com NestJS, PostgreSQL e containers Docker.

## 1. Objetivo do MVP

Cada usuário poderá:

- criar uma conta usando e-mail e senha;
- cadastrar e administrar vários veículos;
- registrar a quilometragem atual de cada veículo manualmente;
- criar manutenções recorrentes por prazo, quilometragem ou pelos dois critérios;
- visualizar separadamente por que uma manutenção está próxima do vencimento ou
  vencida;
- registrar serviços executados, oficina, data, quilometragem, observações e
  custo;
- usar a quilometragem informada em um serviço como nova referência do veículo;
- receber notificações push sobre manutenções próximas ou vencidas;
- registrar despesas relacionadas à manutenção;
- consultar totais e comparativos mensais e anuais;
- começar a partir de uma lista de manutenções básicas e personalizá-la para
  cada veículo.

Não fazem parte do MVP:

- frontend;
- importação da planilha;
- seguros, IPVA, combustível ou gestão financeira geral do carro;
- catálogo de planos de manutenção por fabricante/modelo;
- upload de notas, fotos e outros anexos;
- integração efetiva com Amazon S3.

## 2. Decisões técnicas

### Stack

- Node.js em versão LTS;
- NestJS com TypeScript e modo estrito;
- API REST versionada (`/api/v1`);
- PostgreSQL;
- Prisma ORM e migrations versionadas;
- Redis e BullMQ para tarefas agendadas e envio de notificações;
- Web Push com chaves VAPID;
- autenticação com JWT de curta duração e refresh token rotativo;
- Swagger/OpenAPI;
- Jest para testes unitários e de integração;
- Supertest para testes HTTP;
- Docker Compose para desenvolvimento e execução inicial em VPS.

### Arquitetura

Começar como um monólito modular. Isso reduz a complexidade operacional sem
misturar as responsabilidades e permite separar processos no futuro.

Módulos sugeridos:

```text
src/
  auth/                   cadastro, login e renovação de sessão
  users/                  conta e preferências do usuário
  vehicles/               veículos e registros de quilometragem
  maintenance-templates/  catálogo básico mantido pela aplicação
  maintenance-plans/      regras personalizadas por veículo
  maintenance-records/    histórico de serviços executados
  expenses/               despesas exclusivas de manutenção
  reminders/              cálculo de situação e agendamentos
  notifications/          inscrições push e entregas
  reports/                consolidação mensal e anual
  storage/                contrato para anexos futuros
  health/                 liveness e readiness
  common/                 filtros, guards, decorators e utilitários
```

O módulo `storage` terá somente uma interface e configuração preparada para uma
implementação futura. Credenciais S3, buckets e endpoints de upload não serão
necessários enquanto anexos estiverem fora do escopo.

## 3. Modelo de domínio

### User

- `id` (UUID)
- `name`
- `email` (único e normalizado)
- `passwordHash`
- `timezone` (padrão configurável, inicialmente `America/Sao_Paulo`)
- `createdAt`, `updatedAt`, `deletedAt`

### RefreshSession

- `id`, `userId`
- hash do refresh token, nunca o token em texto puro
- data de expiração, revogação e informações básicas do dispositivo

### Vehicle

- `id`, `userId`
- apelido, marca, modelo, ano e placa opcional
- `currentOdometerKm`
- `currentOdometerRecordedAt`
- `createdAt`, `updatedAt`, `deletedAt`

Dados como Renavam e chassi não são necessários no MVP. Caso sejam adicionados,
devem ser tratados como dados sensíveis e nunca aparecer integralmente em logs.

### OdometerReading

- `id`, `vehicleId`, `userId`
- `odometerKm`, `recordedAt`
- origem: `MANUAL` ou `MAINTENANCE_RECORD`
- vínculo opcional com o serviço que originou a leitura

Manter o histórico de leituras permite auditar correções e calcular a situação
das manutenções sem depender apenas de um campo mutável no veículo. Uma leitura
inferior à atual exige confirmação explícita e fica registrada; ela não reduz
automaticamente a quilometragem de referência.

### MaintenanceTemplate

Catálogo global, somente leitura para usuários comuns:

- nome e descrição sugerida;
- categoria;
- intervalos sugeridos em meses e/ou quilômetros;
- indicador de ativo.

Sugestões iniciais: óleo do motor, filtro de óleo, filtro de ar do motor, filtro
de cabine, filtro de combustível, pastilhas de freio, fluido de freio, velas,
correias, pneus, bateria e líquido de arrefecimento.

Ao selecionar uma sugestão, seus dados são copiados para um plano pertencente ao
veículo. Alterações posteriores no catálogo não sobrescrevem escolhas do
usuário.

### VehicleMaintenancePlan

Representa uma manutenção que o usuário deseja acompanhar:

- `id`, `userId`, `vehicleId` e template de origem opcional;
- nome, descrição e categoria;
- `intervalMonths` opcional;
- `intervalKm` opcional;
- antecedência para alerta em dias e quilômetros;
- referências `lastPerformedAt` e `lastPerformedOdometerKm`;
- `active`, `createdAt`, `updatedAt`, `deletedAt`.

Pelo menos um intervalo deve existir. Os dois critérios, quando configurados,
são sempre avaliados separadamente.

### MaintenanceRecord

- `id`, `userId`, `vehicleId` e plano opcional;
- descrição do serviço;
- data e quilometragem da execução;
- oficina/local e observações opcionais;
- custo total em `numeric`, nunca `float`;
- `createdAt`, `updatedAt`, `deletedAt`.

Concluir um plano cria um registro de histórico e atualiza suas referências de
data e quilometragem em uma única transação. Se a quilometragem for a mais
recente, ela também atualiza a referência atual do veículo.

### Expense

- `id`, `userId`, `vehicleId`;
- registro de manutenção opcional;
- categoria, descrição, data e valor;
- observações opcionais;
- `createdAt`, `updatedAt`, `deletedAt`.

Para evitar dupla contagem, o custo principal do serviço pode gerar uma despesa
vinculada na mesma transação. Relatórios somam despesas; o campo de custo do
histórico funciona como resumo do serviço.

### PushSubscription e NotificationDelivery

A inscrição armazena endpoint e chaves Web Push associados ao usuário e ao
dispositivo. A entrega registra tipo, manutenção, situação, tentativas e
resultado. Inscrições que retornem encerramento definitivo devem ser desativadas.

## 4. Regra de situação da manutenção

Para cada plano ativo, calcular duas situações independentes:

- calendário: baseada em `lastPerformedAt + intervalMonths`;
- quilometragem: baseada em `lastPerformedOdometerKm + intervalKm`.

Cada dimensão poderá resultar em:

- `NOT_CONFIGURED`;
- `ON_TRACK`;
- `DUE_SOON`;
- `OVERDUE`;
- `UNKNOWN`, quando falta uma referência necessária.

A resposta da API deve trazer razões legíveis e valores objetivos. Exemplo:

```json
{
  "overallStatus": "OVERDUE",
  "timeStatus": {
    "status": "OVERDUE",
    "dueDate": "2026-08-01",
    "overdueByDays": 12
  },
  "odometerStatus": {
    "status": "DUE_SOON",
    "dueAtKm": 80000,
    "remainingKm": 350
  },
  "reasons": ["Vencida há 12 dias", "Faltam 350 km para o limite"]
}
```

O estado geral usa a situação mais urgente, mas nunca oculta os resultados
individuais. Datas devem ser calculadas no fuso do usuário; timestamps são
armazenados em UTC.

## 5. API inicial

Principais grupos de endpoints:

- `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`;
- CRUD de `/vehicles` e criação/listagem de `/vehicles/:id/odometer-readings`;
- leitura de `/maintenance-templates`;
- CRUD de `/vehicles/:id/maintenance-plans`;
- conclusão de plano e CRUD de `/vehicles/:id/maintenance-records`;
- CRUD de `/vehicles/:id/expenses`;
- agenda em `/vehicles/:id/maintenance-agenda` com filtros por situação;
- relatórios em `/reports/costs?vehicleId=&period=monthly|yearly`;
- cadastro e remoção de `/push-subscriptions`;
- `/health/live` e `/health/ready`.

Listagens terão paginação, ordenação e filtros explícitos. Todos os recursos
pertencentes ao usuário serão filtrados no servidor pelo `userId` obtido do
token; a API nunca confiará em um `userId` enviado pelo cliente.

## 6. Alertas e push notification

Um job recorrente verifica planos ativos, calcula as situações e cria eventos de
notificação idempotentes. A chave lógica deve impedir alertas duplicados para a
mesma manutenção, dimensão, situação e período.

Fluxo previsto:

```text
Scheduler -> calcula vencimentos -> grava evento -> fila Redis
          -> worker Web Push -> registra sucesso/falha
```

Mesmo sem frontend, a API e o worker poderão ser implementados e testados. Para
receber push de verdade será necessário posteriormente um cliente web com
service worker, permissão do navegador e envio da inscrição para a API.

## 7. Segurança e qualidade

- senhas com Argon2id;
- access token curto e refresh tokens rotativos e revogáveis;
- validação global com whitelist e rejeição de campos desconhecidos;
- rate limit reforçado nos endpoints de autenticação;
- CORS configurado por variável de ambiente;
- Helmet e limite de tamanho das requisições;
- autorização e isolamento de dados testados em todos os módulos multiusuário;
- segredos somente por variáveis de ambiente;
- logs estruturados sem senha, token, placa completa ou dados sensíveis;
- erros padronizados e `requestId` para rastreamento;
- transações para operações que alterem histórico, despesa, plano e hodômetro;
- índices por `userId`, `vehicleId`, datas, status lógico e vínculos usados nos
  relatórios;
- exclusão lógica para dados de negócio e estratégia futura de exportação e
  remoção de conta.

## 8. Containers e operação

O Docker Compose inicial terá:

- `api`: aplicação HTTP NestJS;
- `worker`: processador de filas e notificações usando a mesma imagem;
- `postgres`: banco com volume persistente e healthcheck;
- `redis`: filas e locks, também com healthcheck.

A imagem da aplicação será multi-stage, executará como usuário sem privilégios e
terá um alvo de produção contendo apenas dependências necessárias. O Compose de
desenvolvimento poderá habilitar hot reload; o de produção/VPS não montará o
código-fonte.

Preparação para VPS:

- configurações 12-factor via ambiente;
- migrations executadas por uma etapa controlada de deploy, não por várias
  réplicas simultaneamente;
- API stateless para permitir mais de uma instância;
- proxy reverso externo com TLS;
- backup automatizado e teste periódico de restauração do PostgreSQL;
- volumes fora do ciclo de vida do container;
- endpoints de saúde e encerramento gracioso;
- logs enviados para stdout/stderr.

### Execução local

Use o arquivo de exemplo como ponto de partida e substitua os segredos antes de
executar a aplicação fora do ambiente local:

```bash
cp .env.example .env
docker compose up -d postgres redis
npm run prisma:migrate:deploy
npm ci
npm run start:dev
```

O PostgreSQL do projeto é publicado em `localhost:5433` para evitar conflito
com instalações locais que normalmente usam a porta `5432`.

### Testando pela interface Swagger

Com a API em execução, abra `http://localhost:3000/docs`. O fluxo básico é:

1. Execute `POST /api/v1/auth/register` ou `POST /api/v1/auth/login`.
2. Copie o campo `accessToken` da resposta.
3. Clique em **Authorize**, cole somente o token e confirme.
4. Execute os endpoints protegidos de usuários, veículos e hodômetro.

A autorização fica preservada ao recarregar a página. O documento OpenAPI em
JSON está disponível em `http://localhost:3000/docs/openapi.json`, permitindo
importar a API no Postman, Insomnia ou gerar clientes automaticamente. O
`refreshToken` não deve ser colocado no botão **Authorize**; ele é usado apenas
nos endpoints `/auth/refresh` e `/auth/logout`.

As chaves VAPID podem permanecer com os marcadores do exemplo enquanto as
notificações push não estiverem habilitadas. Antes de enviar alterações, execute
as mesmas verificações da integração contínua:

```bash
npm run lint
npm run typecheck
npm test -- --runInBand
npm run build
```

## 9. Estratégia de testes

- unitários para cálculo de vencimentos, precedência de estados e relatórios;
- integração com PostgreSQL real para repositórios, constraints e transações;
- e2e para autenticação e principais jornadas;
- testes específicos garantindo que um usuário não acesse veículos de outro;
- teste de idempotência dos alertas;
- teste de concorrência ao concluir uma manutenção;
- relógio controlado nos testes para datas, fuso horário e virada de mês/ano.

Jornadas mínimas de aceite:

1. Usuário cria conta, cadastra veículo e informa a quilometragem.
2. Usuário aplica um template, altera seus intervalos e consulta a agenda.
3. A agenda explica separadamente atraso por data e proximidade por km.
4. Usuário conclui o serviço e histórico, despesa, plano e hodômetro permanecem
   consistentes.
5. Relatórios exibem totais mensais e anuais sem duplicar o custo do serviço.
6. O job gera apenas um alerta equivalente e registra a tentativa de push.

## 10. Fases de implementação

### Fase 0 — Fundação

- iniciar projeto NestJS e configuração validada de ambiente;
- configurar lint, format, testes, Swagger e tratamento padronizado de erros;
- criar Dockerfiles e Compose com API, worker, PostgreSQL e Redis;
- configurar Prisma e primeira migration;
- adicionar CI para lint, typecheck, testes e build.

### Fase 1 — Identidade e veículos

- cadastro, login, refresh rotativo e logout;
- usuários, veículos e histórico de hodômetro;
- autorização por proprietário e testes de isolamento.

### Fase 2 — Manutenções

- templates básicos com seed idempotente;
- planos personalizáveis por veículo;
- motor puro de cálculo de situação;
- agenda com razões separadas por tempo e quilometragem;
- histórico e conclusão transacional de manutenção.

### Fase 3 — Custos e relatórios

- despesas de manutenção vinculadas ou independentes;
- categorias controladas e extensíveis;
- totais por veículo, categoria, mês e ano;
- validação contra dupla contagem.

### Fase 4 — Alertas

- Redis, BullMQ, scheduler e worker;
- inscrições Web Push e chaves VAPID;
- deduplicação, tentativas com backoff e registro de entregas;
- mecanismo de teste enquanto não houver frontend.

### Fase 5 — Produção em VPS

- endurecimento da imagem e configuração de produção;
- proxy HTTPS, domínio e política de CORS quando forem definidos;
- backups, observabilidade, deploy e rollback documentados;
- teste de restauração e checklist operacional.

### Fase futura — Anexos

- finalizar o contrato `StorageProvider`;
- implementar provider S3-compatible;
- upload por URL pré-assinada, validação de tipo/tamanho e metadados no banco;
- política de retenção e remoção consistente de objetos.

## 11. Estratégia de execução por agentes e modelos

A implementação será coordenada por um agente principal, responsável por
decompor cada fase, distribuir tarefas independentes, integrar as alterações e
confirmar os critérios de aceite. A escolha do modelo e do nível de raciocínio
será proporcional ao risco da tarefa:

| Tipo de tarefa                                              | Modelo          | Raciocínio |
| ----------------------------------------------------------- | --------------- | ---------- |
| Arquitetura, Prisma/PostgreSQL, autenticação e notificações | `gpt-5.6-sol`   | `high`     |
| Revisões de segurança, domínio e integração entre módulos   | `gpt-5.6-sol`   | `high`     |
| CRUDs, seeds, documentação e ajustes rotineiros             | `gpt-5.6-sol`   | `medium`   |
| Trabalho bem definido quando custo for prioridade           | `gpt-5.6-terra` | `high`     |
| Problemas excepcionalmente difíceis                         | `gpt-5.6-sol`   | `xhigh`    |

O nível `xhigh` não será usado como padrão. Ele será reservado para um bloqueio
concreto que permaneça difícil após investigação em `high`, como uma condição de
corrida, falha de consistência ou problema arquitetural complexo.

### Regras de coordenação

- executar uma fase por vez e dividi-la em tarefas pequenas, com arquivos e
  critérios de aceite claros;
- paralelizar apenas trabalhos independentes que não alterem os mesmos arquivos
  nem dependam de uma decisão ainda pendente;
- centralizar alterações de schema e migrations do Prisma para manter uma única
  sequência coerente;
- limitar o trabalho simultâneo à capacidade disponível de agentes;
- exigir que cada agente informe arquivos alterados, testes executados, riscos e
  pendências;
- integrar alterações somente depois de lint, typecheck e testes relevantes;
- realizar ao final de cada fase uma revisão integrada com `gpt-5.6-sol` em
  `high`;
- não considerar uma fase concluída enquanto seus critérios de aceite e testes
  não estiverem satisfeitos.

### Distribuição sugerida por fase

- Fase 0: agente principal em `high`; documentação e CI podem usar `medium`.
- Fase 1: autenticação e autorização em `high`; CRUD de veículos em `medium`.
- Fase 2: modelo de domínio, transações e cálculo de vencimentos em `high`;
  templates e CRUDs em `medium`.
- Fase 3: regras de consolidação financeira em `high`; endpoints e documentação
  em `medium`.
- Fase 4: filas, idempotência e Web Push em `high`.
- Fase 5: segurança operacional e revisão para VPS em `high`; documentação de
  operação em `medium`.

## 12. Definição de pronto do MVP

O MVP estará pronto quando as seis jornadas de aceite funcionarem pela API
documentada, os testes críticos passarem, as migrations forem reproduzíveis do
zero e todo o sistema puder ser iniciado por Docker Compose sem configuração
manual além do arquivo de ambiente e das chaves VAPID.
